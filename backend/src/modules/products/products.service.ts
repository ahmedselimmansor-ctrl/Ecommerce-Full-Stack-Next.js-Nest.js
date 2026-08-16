import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';
import { CacheKeys } from '../../common/redis/redis.constants';
import { Paginated, paginate } from '../../common/dto/pagination.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

const LIST_SELECT = {
  id: true,
  name: true,
  nameAr: true,
  slug: true,
  priceCents: true,
  compareAtCents: true,
  currency: true,
  gender: true,
  ratingAvg: true,
  ratingCount: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { id: true, name: true, nameAr: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: 'asc' }, take: 2 },
  variants: { select: { size: true, color: true, colorAr: true, colorHex: true, stock: true } },
} satisfies Prisma.ProductSelect;

export interface ProductFilters {
  sizes: string[];
  colors: { name: string; nameAr: string | null; hex: string | null }[];
  priceRange: { minCents: number; maxCents: number };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(query: ProductQueryDto): Promise<Paginated<unknown>> {
    const cacheKey = CacheKeys.productList(query.fingerprint());

    return this.cache.wrap(cacheKey, async () => {
      const where = this.buildWhere(query);
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          select: LIST_SELECT,
          orderBy: this.buildOrderBy(query.sort),
          skip: query.skip,
          take: query.pageSize,
        }),
        this.prisma.product.count({ where }),
      ]);

      return paginate(rows.map((row) => this.shapeListItem(row)), total, query.page, query.pageSize);
    });
  }

  async featured(limit = 8) {
    return this.cache.wrap(
      CacheKeys.featuredProducts(),
      async () => {
        const rows = await this.prisma.product.findMany({
          where: { isActive: true, isFeatured: true },
          select: LIST_SELECT,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return rows.map((row) => this.shapeListItem(row));
      },
      300,
    );
  }

  async findBySlug(slug: string) {
    return this.cache.wrap(CacheKeys.productDetail(slug), async () => {
      const product = await this.prisma.product.findFirst({
        where: { slug, isActive: true },
        include: {
          category: { select: { id: true, name: true, nameAr: true, slug: true } },
          images: { orderBy: { position: 'asc' } },
          variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
        },
      });

      if (!product) throw new NotFoundException('Product not found.');

      const related = await this.prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
        select: LIST_SELECT,
        take: 4,
        orderBy: { createdAt: 'desc' },
      });

      return {
        ...product,
        inStock: product.variants.some((variant) => variant.stock > 0),
        related: related.map((row) => this.shapeListItem(row)),
      };
    });
  }

  /** Facet values that drive the storefront filter sidebar. */
  async filters(): Promise<ProductFilters> {
    return this.cache.wrap(
      'products:filters',
      async () => {
        const [variants, aggregate] = await this.prisma.$transaction([
          this.prisma.productVariant.findMany({
            where: { product: { isActive: true } },
            select: { size: true, color: true, colorAr: true, colorHex: true },
            distinct: ['size', 'color'],
          }),
          this.prisma.product.aggregate({
            where: { isActive: true },
            _min: { priceCents: true },
            _max: { priceCents: true },
          }),
        ]);

        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const sizes = [...new Set(variants.map((variant) => variant.size))].sort((a, b) => {
          const indexA = sizeOrder.indexOf(a);
          const indexB = sizeOrder.indexOf(b);
          if (indexA === -1 || indexB === -1) return a.localeCompare(b);
          return indexA - indexB;
        });

        const colorMap = new Map<string, { nameAr: string | null; hex: string | null }>();
        for (const variant of variants) {
          if (!colorMap.has(variant.color)) {
            colorMap.set(variant.color, { nameAr: variant.colorAr, hex: variant.colorHex });
          }
        }

        return {
          sizes,
          colors: [...colorMap.entries()]
            .map(([name, meta]) => ({ name, nameAr: meta.nameAr, hex: meta.hex }))
            .sort((a, b) => a.name.localeCompare(b.name)),
          priceRange: {
            minCents: aggregate._min.priceCents ?? 0,
            maxCents: aggregate._max.priceCents ?? 0,
          },
        };
      },
      600,
    );
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        slug: dto.slug,
        description: dto.description,
        descriptionAr: dto.descriptionAr ?? null,
        priceCents: dto.priceCents,
        compareAtCents: dto.compareAtCents ?? null,
        gender: dto.gender,
        material: dto.material ?? null,
        materialAr: dto.materialAr ?? null,
        care: dto.care ?? null,
        careAr: dto.careAr ?? null,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        categoryId: dto.categoryId,
        images: {
          create: dto.images.map((image, index) => ({
            url: image.url,
            alt: image.alt ?? dto.name,
            position: image.position ?? index,
          })),
        },
        variants: { create: dto.variants },
      },
      include: { images: true, variants: true },
    });

    await this.invalidate();
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) throw new NotFoundException('Product not found.');

    const { images, variants, ...scalars } = dto;

    const product = await this.prisma.$transaction(async (tx) => {
      // Images and variants are replaced wholesale — the admin UI always sends
      // the complete desired set, which keeps ordering and deletions simple.
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((image, index) => ({
            productId: id,
            url: image.url,
            alt: image.alt ?? null,
            position: image.position ?? index,
          })),
        });
      }

      if (variants) {
        const keepSkus = variants.map((variant) => variant.sku);
        await tx.productVariant.deleteMany({ where: { productId: id, sku: { notIn: keepSkus } } });
        for (const variant of variants) {
          await tx.productVariant.upsert({
            where: { sku: variant.sku },
            update: {
              size: variant.size,
              color: variant.color,
              colorAr: variant.colorAr ?? null,
              colorHex: variant.colorHex ?? null,
              priceCents: variant.priceCents ?? null,
              stock: variant.stock,
            },
            create: { ...variant, productId: id },
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: scalars,
        include: { images: { orderBy: { position: 'asc' } }, variants: true },
      });
    });

    await this.invalidate(existing.slug, product.slug);
    return product;
  }

  async remove(id: string): Promise<void> {
    // Soft delete: order history keeps pointing at a real product row.
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: { slug: true },
    });
    await this.invalidate(product.slug);
  }

  async setStock(variantId: string, stock: number) {
    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      include: { product: { select: { slug: true } } },
    });
    await this.invalidate(variant.product.slug);
    return variant;
  }

  private buildWhere(query: ProductQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { isActive: true };
    const and: Prisma.ProductWhereInput[] = [];

    if (query.q) {
      and.push({
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { category: { name: { contains: query.q, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.category) and.push({ category: { slug: query.category } });
    if (query.gender) and.push({ gender: query.gender });

    if (query.minPrice !== undefined) and.push({ priceCents: { gte: query.minPrice } });
    if (query.maxPrice !== undefined) and.push({ priceCents: { lte: query.maxPrice } });

    // Size + colour must be satisfied by the *same* variant, otherwise a product
    // that has "S/Red" and "L/Blue" would wrongly match a "S + Blue" filter.
    const variantConditions: Prisma.ProductVariantWhereInput = {};
    if (query.size?.length) variantConditions.size = { in: query.size };
    if (query.color?.length) variantConditions.color = { in: query.color };
    if (query.inStock) variantConditions.stock = { gt: 0 };
    if (Object.keys(variantConditions).length > 0) and.push({ variants: { some: variantConditions } });

    if (and.length > 0) where.AND = and;
    return where;
  }

  private buildOrderBy(sort?: ProductSort): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return { priceCents: 'asc' };
      case ProductSort.PRICE_DESC:
        return { priceCents: 'desc' };
      case ProductSort.RATING:
        return { ratingAvg: 'desc' };
      case ProductSort.NAME:
        return { name: 'asc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  /** Collapse variant rows into the small shape a product card actually needs. */
  private shapeListItem(row: Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>) {
    const colorMap = new Map<string, { hex: string | null; nameAr: string | null }>();
    for (const variant of row.variants) {
      if (!colorMap.has(variant.color)) {
        colorMap.set(variant.color, { hex: variant.colorHex, nameAr: variant.colorAr });
      }
    }

    const { variants, ...rest } = row;
    return {
      ...rest,
      sizes: [...new Set(variants.map((variant) => variant.size))],
      colors: [...colorMap.entries()].map(([name, meta]) => ({ name, nameAr: meta.nameAr, hex: meta.hex })),
      inStock: variants.some((variant) => variant.stock > 0),
    };
  }

  private async invalidate(...slugs: (string | undefined)[]): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix(CacheKeys.productListPrefix),
      this.cache.del(CacheKeys.featuredProducts(), 'products:filters'),
      ...slugs.filter(Boolean).map((slug) => this.cache.del(CacheKeys.productDetail(slug as string))),
    ]);
  }
}
