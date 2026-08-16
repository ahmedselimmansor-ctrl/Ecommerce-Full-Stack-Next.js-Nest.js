import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';
import { CacheKeys } from '../../common/redis/redis.constants';
import { Paginated, paginate } from '../../common/dto/pagination.dto';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

/** Statuses a customer is allowed to reach on their own. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAID];

const ORDER_INCLUDE = {
  items: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly currency: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly cache: CacheService,
    config: ConfigService,
  ) {
    this.currency = config.get<string>('currency', 'EGP');
  }

  /**
   * Checkout and cancellation both move stock, so the cached catalogue has to be
   * dropped for the affected products. Without this a shopper can keep seeing
   * "in stock" for up to the cache TTL after the last unit is claimed.
   */
  private async invalidateCatalogue(slugs: string[]): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix(CacheKeys.productListPrefix),
      this.cache.del(CacheKeys.featuredProducts(), 'products:filters'),
      ...[...new Set(slugs)].map((slug) => this.cache.del(CacheKeys.productDetail(slug))),
    ]);
  }

  /**
   * Checkout. Prices come from the database, never the client, and stock is
   * decremented with a conditional UPDATE so two concurrent checkouts cannot
   * both claim the last unit.
   */
  async create(userId: string, dto: CreateOrderDto) {
    const requested = dto.items?.length
      ? dto.items
      : (await this.prisma.cart.findUnique({ where: { userId }, include: { items: true } }))?.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })) ?? [];

    if (requested.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }

    const lines = await this.cart.resolveLines(requested);
    if (lines.length === 0) {
      throw new BadRequestException('None of the items in your cart are available any more.');
    }

    const summary = this.cart.summarize(lines);
    const address = dto.shippingAddress;

    const order = await this.prisma.$transaction(
      async (tx) => {
        for (const line of lines) {
          const claimed = await tx.productVariant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });

          if (claimed.count === 0) {
            throw new ConflictException(
              `${line.name} (${line.size} / ${line.color}) just sold out. Please adjust your cart.`,
            );
          }
        }

        const created = await tx.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            userId,
            status: OrderStatus.PENDING,
            paymentMethod: dto.paymentMethod,
            currency: this.currency,
            subtotalCents: summary.subtotalCents,
            shippingCents: summary.shippingCents,
            discountCents: 0,
            totalCents: summary.totalCents,
            shipFullName: address.fullName,
            shipPhone: address.phone,
            shipLine1: address.line1,
            shipLine2: address.line2 ?? null,
            shipCity: address.city,
            shipState: address.state,
            shipPostalCode: address.postalCode ?? null,
            shipCountry: address.country ?? 'EG',
            notes: dto.notes ?? null,
            items: {
              create: lines.map((line) => ({
                variantId: line.variantId,
                productName: line.name,
                productNameAr: line.nameAr,
                productSlug: line.slug,
                sku: line.sku,
                size: line.size,
                color: line.color,
                colorAr: line.colorAr,
                imageUrl: line.imageUrl,
                unitPriceCents: line.unitPriceCents,
                quantity: line.quantity,
              })),
            },
          },
          include: ORDER_INCLUDE,
        });

        const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });
        if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      },
      { timeout: 15_000 },
    );

    await this.invalidateCatalogue(lines.map((line) => line.slug));

    this.logger.log(`Order ${order.orderNumber} placed by ${userId} for ${order.totalCents} ${order.currency}`);
    return order;
  }

  async listForUser(userId: string, query: OrderQueryDto): Promise<Paginated<unknown>> {
    const where: Prisma.OrderWhereInput = { userId, ...(query.status ? { status: query.status } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async listAll(query: OrderQueryDto): Promise<Paginated<unknown>> {
    const where: Prisma.OrderWhereInput = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async findOne(orderId: string, requester: { id: string; role: Role }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot view this order.');
    }
    return order;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found.');

    // Cancelling or refunding must return the reserved units to stock.
    const releasesStock =
      (dto.status === OrderStatus.CANCELLED || dto.status === OrderStatus.REFUNDED) &&
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.REFUNDED;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (releasesStock) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: dto.status, paymentRef: dto.paymentRef ?? order.paymentRef },
        include: ORDER_INCLUDE,
      });
    });

    if (releasesStock) {
      await this.invalidateCatalogue(order.items.map((item) => item.productSlug));
    }

    return updated;
  }

  async cancel(orderId: string, requester: { id: string; role: Role }) {
    const order = await this.findOne(orderId, requester);

    if (requester.role !== Role.ADMIN && !CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new BadRequestException('This order can no longer be cancelled. Please contact support.');
    }

    return this.updateStatus(orderId, { status: OrderStatus.CANCELLED });
  }

  /**
   * `ATL-20260814-048213` — readable and sortable for support, with enough
   * entropy that the unique constraint effectively never fires.
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('');
    return `ATL-${datePart}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
  }
}
