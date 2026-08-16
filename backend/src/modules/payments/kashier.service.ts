import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface KashierConfig {
  merchantId: string;
  apiKey: string;
  secretKey: string;
  mode: 'test' | 'live';
  baseUrl: string;
  display: 'en' | 'ar';
  allowedMethods: string;
  enabled: boolean;
}

export interface KashierSession {
  /** Ready-to-open hosted payment page URL. */
  checkoutUrl: string;
  /** Same values as query params, for merchants who prefer to render the iframe. */
  params: Record<string, string>;
  merchantOrderId: string;
  amount: string;
  currency: string;
  hash: string;
  mode: string;
}

export interface KashierWebhookBody {
  event?: string;
  data?: Record<string, unknown> & {
    signatureKeys?: string[];
    signature?: string;
  };
}

/**
 * Kashier hosted-payment-page integration.
 *
 * Two independent signatures are involved and they are computed differently:
 *
 *  1. Outbound (order hash) — HMAC-SHA256 over the literal string
 *     `/?payment=<mid>.<orderId>.<amount>.<currency>` keyed with the API key.
 *     Kashier rejects the payment if this does not match the query it receives,
 *     which is what stops a shopper editing the amount in the URL.
 *
 *  2. Inbound (webhook / redirect) — HMAC-SHA256 over `k=v&k=v` built from the
 *     fields named in `signatureKeys`, in that exact order, keyed with the
 *     secret key. Any deviation in order or encoding changes the digest.
 */
@Injectable()
export class KashierService {
  private readonly logger = new Logger(KashierService.name);
  private readonly config: KashierConfig;
  private readonly storefrontUrl: string;
  private readonly apiPublicUrl: string;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<KashierConfig>('kashier');
    this.storefrontUrl = configService.get<string>('storefrontUrl', 'http://localhost:3000');
    this.apiPublicUrl = configService.get<string>('apiPublicUrl', 'http://localhost:8080/api/v1');
  }

  get isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Minor units to the exact decimal string that will be signed and sent. */
  private formatAmount(amountCents: number): string {
    return (amountCents / 100).toFixed(2);
  }

  private hmacHex(payload: string, key: string): string {
    return createHmac('sha256', key).update(payload).digest('hex');
  }

  /** Constant-time compare so a wrong signature cannot be probed byte by byte. */
  private safeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a ?? '', 'utf8');
    const right = Buffer.from(b ?? '', 'utf8');
    if (left.length !== right.length || left.length === 0) return false;
    return timingSafeEqual(left, right);
  }

  buildOrderHash(merchantOrderId: string, amount: string, currency: string): string {
    const path = `/?payment=${this.config.merchantId}.${merchantOrderId}.${amount}.${currency}`;
    return this.hmacHex(path, this.config.apiKey);
  }

  createSession(input: {
    merchantOrderId: string;
    amountCents: number;
    currency: string;
    customerReference?: string;
    locale?: 'en' | 'ar';
  }): KashierSession {
    if (!this.isEnabled) {
      throw new BadRequestException('Card payment is not configured on this environment.');
    }

    const amount = this.formatAmount(input.amountCents);
    const hash = this.buildOrderHash(input.merchantOrderId, amount, input.currency);

    const params: Record<string, string> = {
      merchantId: this.config.merchantId,
      orderId: input.merchantOrderId,
      amount,
      currency: input.currency,
      hash,
      mode: this.config.mode,
      merchantRedirect: `${this.storefrontUrl}/${input.locale ?? this.config.display}/checkout/callback`,
      // Kashier posts here server-to-server; the redirect above is only a UX
      // convenience and is never trusted on its own to mark an order paid.
      serverWebhook: `${this.apiPublicUrl}/payments/kashier/webhook`,
      allowedMethods: this.config.allowedMethods,
      display: input.locale ?? this.config.display,
      redirectMethod: 'get',
      failureRedirect: 'true',
      brandColor: '#14110f',
    };

    if (input.customerReference) params.customerReference = input.customerReference;

    const query = new URLSearchParams(params).toString();

    return {
      checkoutUrl: `${this.config.baseUrl}/?${query}`,
      params,
      merchantOrderId: input.merchantOrderId,
      amount,
      currency: input.currency,
      hash,
      mode: this.config.mode,
    };
  }

  /**
   * Verify a webhook body. `signatureKeys` names the fields Kashier signed and
   * the order they were concatenated in — it is echoed back in the payload
   * precisely so integrators do not have to hard-code a field list that the
   * gateway may extend later.
   */
  verifyWebhook(body: KashierWebhookBody, headerSignature?: string): boolean {
    const data = body?.data;
    if (!data) return false;

    const keys = data.signatureKeys;
    const presented = (data.signature as string | undefined) ?? headerSignature;

    if (!Array.isArray(keys) || keys.length === 0 || !presented) {
      this.logger.warn('Kashier webhook is missing signatureKeys or a signature');
      return false;
    }

    const queryString = keys.map((key) => `${key}=${this.stringify(data[key])}`).join('&');
    const expected = this.hmacHex(queryString, this.config.secretKey);

    const ok = this.safeEquals(expected, presented);
    if (!ok) this.logger.warn('Kashier webhook signature mismatch');
    return ok;
  }

  /**
   * Verify the browser redirect. Kashier signs every query parameter except
   * `signature` and `mode`, sorted alphabetically.
   */
  verifyRedirect(query: Record<string, string>): boolean {
    const presented = query.signature;
    if (!presented) return false;

    const queryString = Object.keys(query)
      .filter((key) => key !== 'signature' && key !== 'mode')
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    return this.safeEquals(this.hmacHex(queryString, this.config.secretKey), presented);
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
