import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';
import { CacheKeys } from '../../common/redis/redis.constants';
import { Paginated, paginate } from '../../common/dto/pagination.dto';
import { CreateReviewDto, ReviewQueryDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listForProduct(slug: string, query: ReviewQueryDto): Promise<Paginated<unknown>> {
    const product = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found.');

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId: product.id },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.review.count({ where: { productId: product.id } }),
    ]);

    return paginate(
      items.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt,
        // Only the initial of the surname is exposed publicly.
        author: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  /** Only customers with a delivered order containing the product may review it. */
  async create(userId: string, slug: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found.');

    const purchased = await this.prisma.order.count({
      where: {
        userId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
        items: { some: { productSlug: slug } },
      },
    });

    if (purchased === 0) {
      throw new ForbiddenException('You can review a product once your order has shipped.');
    }

    const review = await this.prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId } },
      update: { rating: dto.rating, title: dto.title ?? null, body: dto.body },
      create: { productId: product.id, userId, rating: dto.rating, title: dto.title ?? null, body: dto.body },
    });

    await this.recalculateRating(product.id, slug);
    return review;
  }

  async remove(reviewId: string, requester: { id: string; role: Role }): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { id: true, slug: true } } },
    });
    if (!review) throw new NotFoundException('Review not found.');
    if (review.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot delete this review.');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.recalculateRating(review.product.id, review.product.slug);
  }

  /** Denormalised rating on the product row keeps list queries to a single table. */
  private async recalculateRating(productId: string, slug: string): Promise<void> {
    const aggregate = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        ratingCount: aggregate._count.rating,
      },
    });

    await Promise.all([
      this.cache.del(CacheKeys.productDetail(slug)),
      this.cache.delByPrefix(CacheKeys.productListPrefix),
    ]);
  }
}
