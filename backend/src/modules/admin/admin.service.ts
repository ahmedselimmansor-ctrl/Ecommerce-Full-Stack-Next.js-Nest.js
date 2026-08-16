import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Paginated, paginate } from '../../common/dto/pagination.dto';
import { AdminProductQueryDto } from './dto/admin.dto';

/** Orders in these states represent money the shop can actually count. */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const LOW_STOCK_THRESHOLD = 5;

export interface AdminStats {
  revenueCents: number;
  orderCount: number;
  averageOrderCents: number;
  pendingOrders: number;
  awaitingPayment: number;
  customerCount: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockVariants: number;
  lowStockVariants: { id: string; sku: string; size: string; color: string; stock: number; productName: string }[];
  revenueByDay: { date: string; revenueCents: number; orders: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: { productSlug: string; productName: string; unitsSold: number; revenueCents: number }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(days = 30): Promise<AdminStats> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      revenue,
      pendingOrders,
      awaitingPayment,
      customerCount,
      activeProducts,
      inactiveProducts,
      outOfStockVariants,
      lowStock,
      recentOrders,
      topItems,
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { paymentStatus: PaymentStatus.AWAITING_PAYMENT } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: false } }),
      this.prisma.productVariant.count({ where: { stock: 0, product: { isActive: true } } }),
      this.prisma.productVariant.findMany({
        where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
        select: { id: true, sku: true, size: true, color: true, stock: true, product: { select: { name: true } } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { in: REVENUE_STATUSES } },
        select: { createdAt: true, totalCents: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productSlug', 'productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const revenueCents = revenue._sum.totalCents ?? 0;
    const orderCount = revenue._count._all;

    // Kept outside the transaction above: Prisma's groupBy result type widens
    // when it is one element of a $transaction tuple.
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
      orderBy: { status: 'asc' },
    });

    // Bucket in memory rather than with date_trunc: the window is 30 days of
    // paid orders, and this keeps the query portable.
    const byDay = new Map<string, { revenueCents: number; orders: number }>();
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      byDay.set(date, { revenueCents: 0, orders: 0 });
    }
    for (const order of recentOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.revenueCents += order.totalCents;
        bucket.orders += 1;
      }
    }

    const revenueBySlug = await this.revenueForSlugs(topItems.map((item) => item.productSlug));

    return {
      revenueCents,
      orderCount,
      averageOrderCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
      pendingOrders,
      awaitingPayment,
      customerCount,
      activeProducts,
      inactiveProducts,
      outOfStockVariants,
      lowStockVariants: lowStock.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        productName: variant.product.name,
      })),
      revenueByDay: [...byDay.entries()].map(([date, value]) => ({ date, ...value })),
      ordersByStatus: statusGroups.map((group) => ({ status: group.status, count: group._count.status })),
      topProducts: topItems.map((item) => ({
        productSlug: item.productSlug,
        productName: item.productName,
        unitsSold: item._sum?.quantity ?? 0,
        revenueCents: revenueBySlug.get(item.productSlug) ?? 0,
      })),
    };
  }

  private async revenueForSlugs(slugs: string[]): Promise<Map<string, number>> {
    if (slugs.length === 0) return new Map();

    const rows = await this.prisma.orderItem.findMany({
      where: { productSlug: { in: slugs }, order: { status: { in: REVENUE_STATUSES } } },
      select: { productSlug: true, unitPriceCents: true, quantity: true },
    });

    const totals = new Map<string, number>();
    for (const row of rows) {
      totals.set(row.productSlug, (totals.get(row.productSlug) ?? 0) + row.unitPriceCents * row.quantity);
    }
    return totals;
  }

  /** Catalogue listing for the dashboard: includes inactive rows and stock totals. */
  async listProducts(query: AdminProductQueryDto): Promise<Paginated<unknown>> {
    const where: Prisma.ProductWhereInput = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { nameAr: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = { slug: query.category };
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, nameAr: true, slug: true } },
          images: { orderBy: { position: 'asc' } },
          variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    const items = rows.map((product) => ({
      ...product,
      totalStock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
      variantCount: product.variants.length,
    }));

    return paginate(items, total, query.page, query.pageSize);
  }

  async getProduct(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      },
    });
  }
}
