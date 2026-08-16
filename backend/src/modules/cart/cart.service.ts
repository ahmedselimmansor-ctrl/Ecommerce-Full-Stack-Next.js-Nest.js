import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartItemInputDto } from './dto/cart.dto';

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  nameAr: string | null;
  sku: string;
  size: string;
  color: string;
  colorAr: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  /** Quantity actually available; the UI shows a warning when it is below `quantity`. */
  availableStock: number;
  lineTotalCents: number;
}

export interface CartSummary {
  items: CartLine[];
  currency: string;
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
  hasIssues: boolean;
}

@Injectable()
export class CartService {
  private readonly currency: string;
  private readonly freeShippingThreshold: number;
  private readonly flatShipping: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.currency = config.get<string>('currency', 'EGP');
    this.freeShippingThreshold = config.get<number>('shipping.freeThresholdCents', 150000);
    this.flatShipping = config.get<number>('shipping.flatCents', 6000);
  }

  async get(userId: string): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!cart || cart.items.length === 0) return this.summarize([]);

    return this.summarize(
      await this.resolveLines(cart.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity }))),
    );
  }

  /** Replace the whole cart — this is what the client store calls after any local edit. */
  async sync(userId: string, items: CartItemInputDto[]): Promise<CartSummary> {
    const deduped = this.dedupe(items);

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (deduped.length > 0) {
        await tx.cartItem.createMany({
          data: deduped.map((item) => ({ cartId: cart.id, variantId: item.variantId, quantity: item.quantity })),
          skipDuplicates: true,
        });
      }
    });

    return this.summarize(await this.resolveLines(deduped));
  }

  /**
   * Sign-in merge: local guest quantities are added on top of whatever the
   * account already had, capped at the per-variant maximum.
   */
  async merge(userId: string, guestItems: CartItemInputDto[]): Promise<CartSummary> {
    const existing = await this.prisma.cart.findUnique({ where: { userId }, include: { items: true } });

    const merged = new Map<string, number>();
    for (const item of existing?.items ?? []) merged.set(item.variantId, item.quantity);
    for (const item of guestItems) {
      merged.set(item.variantId, Math.min(20, (merged.get(item.variantId) ?? 0) + item.quantity));
    }

    return this.sync(
      userId,
      [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity })),
    );
  }

  async addItem(userId: string, input: CartItemInputDto): Promise<CartSummary> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant) throw new NotFoundException('This item is no longer available.');
    if (variant.stock < input.quantity) {
      throw new BadRequestException(`Only ${variant.stock} left in stock.`);
    }

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
      const line = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
      });

      const nextQuantity = Math.min(20, (line?.quantity ?? 0) + input.quantity);
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
        update: { quantity: nextQuantity },
        create: { cartId: cart.id, variantId: input.variantId, quantity: nextQuantity },
      });
    });

    return this.get(userId);
  }

  async setQuantity(userId: string, variantId: string, quantity: number): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart is empty.');

    if (quantity === 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    } else {
      await this.prisma.cartItem.update({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        data: { quantity },
      });
    }

    return this.get(userId);
  }

  async clear(userId: string): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.summarize([]);
  }

  /**
   * Turn `{variantId, quantity}` pairs into priced lines using *current* database
   * prices. Client-sent prices are never trusted.
   */
  async resolveLines(items: CartItemInputDto[]): Promise<CartLine[]> {
    if (items.length === 0) return [];

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: items.map((item) => item.variantId) } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
            priceCents: true,
            isActive: true,
            images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
    });

    const byId = new Map(variants.map((variant) => [variant.id, variant]));

    return items.flatMap((item) => {
      const variant = byId.get(item.variantId);
      // Silently drop lines whose product was deleted or deactivated.
      if (!variant || !variant.product.isActive) return [];

      const unitPriceCents = variant.priceCents ?? variant.product.priceCents;
      return [
        {
          variantId: variant.id,
          productId: variant.product.id,
          slug: variant.product.slug,
          name: variant.product.name,
          nameAr: variant.product.nameAr,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          colorAr: variant.colorAr,
          colorHex: variant.colorHex,
          imageUrl: variant.product.images[0]?.url ?? null,
          unitPriceCents,
          quantity: item.quantity,
          availableStock: variant.stock,
          lineTotalCents: unitPriceCents * item.quantity,
        },
      ];
    });
  }

  summarize(lines: CartLine[]): CartSummary {
    const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
    const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
    const shippingCents =
      lines.length === 0 || subtotalCents >= this.freeShippingThreshold ? 0 : this.flatShipping;

    return {
      items: lines,
      currency: this.currency,
      itemCount,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      freeShippingThresholdCents: this.freeShippingThreshold,
      hasIssues: lines.some((line) => line.availableStock < line.quantity),
    };
  }

  private dedupe(items: CartItemInputDto[]): CartItemInputDto[] {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.variantId, Math.min(20, (map.get(item.variantId) ?? 0) + item.quantity));
    }
    return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
  }
}
