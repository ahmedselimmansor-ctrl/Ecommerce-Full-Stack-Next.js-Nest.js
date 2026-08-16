import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KashierService, type KashierSession, type KashierWebhookBody } from './kashier.service';

/** Kashier reports these in `data.status`. Anything else is treated as failed. */
const SUCCESS_STATUSES = new Set(['SUCCESS', 'PAID', 'CAPTURED', 'APPROVED']);
const PENDING_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'INITIATED']);

export interface WebhookResult {
  received: true;
  applied: boolean;
  reason?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kashier: KashierService,
  ) {}

  /**
   * Start (or restart) a card payment for an order the caller owns.
   *
   * The amount is always read from the order row, never from the request, so a
   * tampered client cannot pay less than the order is worth.
   */
  async createKashierSession(
    orderId: string,
    requester: { id: string; role: Role },
    locale: 'en' | 'ar' = 'en',
  ): Promise<KashierSession> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot pay for this order.');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This order has already been paid.');
    }
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('This order is no longer payable.');
    }

    const session = this.kashier.createSession({
      // Kashier keys the payment on our order number, which is what comes back
      // in the webhook as merchantOrderId.
      merchantOrderId: order.orderNumber,
      amountCents: order.totalCents,
      currency: order.currency,
      customerReference: order.userId,
      locale,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: PaymentMethod.CARD,
        paymentProvider: 'kashier',
        paymentStatus: PaymentStatus.AWAITING_PAYMENT,
      },
    });

    return session;
  }

  /**
   * Apply a Kashier webhook.
   *
   * Always returns 2xx to the gateway — an unverified or duplicate delivery is
   * recorded and acknowledged rather than rejected, because a non-2xx makes
   * Kashier retry a callback that will never succeed.
   */
  async handleKashierWebhook(body: KashierWebhookBody, headerSignature?: string): Promise<WebhookResult> {
    const signatureOk = this.kashier.verifyWebhook(body, headerSignature);
    const data = body?.data ?? {};

    const transactionId = String(data.transactionId ?? data.merchantOrderId ?? data.orderId ?? '');
    const merchantOrderId = String(data.merchantOrderId ?? data.orderId ?? '');
    const status = String(data.status ?? 'UNKNOWN').toUpperCase();
    const eventType = String(body?.event ?? 'unknown');

    if (!transactionId) {
      this.logger.warn('Kashier webhook without a transaction reference');
      return { received: true, applied: false, reason: 'missing_transaction_id' };
    }

    const order = merchantOrderId
      ? await this.prisma.order.findUnique({ where: { orderNumber: merchantOrderId } })
      : null;

    const amountCents = this.parseAmountCents(data.amount);

    // Record first: the audit row is the idempotency key.
    try {
      await this.prisma.paymentEvent.create({
        data: {
          orderId: order?.id ?? null,
          provider: 'kashier',
          eventType,
          transactionId,
          status,
          amountCents,
          currency: data.currency ? String(data.currency) : null,
          signatureOk,
          payload: body as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.log(`Duplicate Kashier callback ${eventType}/${transactionId} ignored`);
        return { received: true, applied: false, reason: 'duplicate' };
      }
      throw error;
    }

    if (!signatureOk) {
      this.logger.warn(`Rejected Kashier callback ${transactionId}: bad signature`);
      return { received: true, applied: false, reason: 'invalid_signature' };
    }
    if (!order) {
      this.logger.warn(`Kashier callback for unknown order ${merchantOrderId}`);
      return { received: true, applied: false, reason: 'unknown_order' };
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { received: true, applied: false, reason: 'already_paid' };
    }

    // A correctly signed callback can still carry the wrong amount if the
    // merchant account is misconfigured; refuse to mark such an order paid.
    if (SUCCESS_STATUSES.has(status) && amountCents !== null && amountCents !== order.totalCents) {
      this.logger.error(
        `Kashier amount mismatch on ${order.orderNumber}: paid ${amountCents}, expected ${order.totalCents}`,
      );
      return { received: true, applied: false, reason: 'amount_mismatch' };
    }

    const paymentStatus = SUCCESS_STATUSES.has(status)
      ? PaymentStatus.PAID
      : PENDING_STATUSES.has(status)
        ? PaymentStatus.AWAITING_PAYMENT
        : PaymentStatus.FAILED;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        paymentProvider: 'kashier',
        paymentRef: transactionId,
        paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : null,
        // Paying moves the order forward; a failure leaves it PENDING so the
        // shopper can retry without losing their reserved stock.
        status: paymentStatus === PaymentStatus.PAID ? OrderStatus.PAID : order.status,
      },
    });

    this.logger.log(`Kashier ${status} applied to ${order.orderNumber} (${transactionId})`);
    return { received: true, applied: true };
  }

  /**
   * Reconcile from the browser redirect.
   *
   * The redirect is signed too, but it is only ever used to *read* state back to
   * the shopper — the webhook remains the sole writer of PAID.
   */
  async reconcileFromRedirect(query: Record<string, string>, requester: { id: string; role: Role }) {
    const merchantOrderId = query.merchantOrderId ?? query.orderId;
    if (!merchantOrderId) throw new BadRequestException('Missing order reference.');

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: merchantOrderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot view this order.');
    }

    return {
      order,
      signatureValid: this.kashier.verifyRedirect(query),
      gatewayStatus: query.paymentStatus ?? query.status ?? null,
    };
  }

  private parseAmountCents(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100);
  }
}
