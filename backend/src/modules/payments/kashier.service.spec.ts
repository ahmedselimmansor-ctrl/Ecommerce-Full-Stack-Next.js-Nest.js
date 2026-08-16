import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { KashierService } from './kashier.service';

const MERCHANT_ID = 'MID-1234-567';
const API_KEY = 'test-api-key';
const SECRET_KEY = 'test-secret-key';

function buildService(): KashierService {
  const config = {
    getOrThrow: (key: string) => {
      if (key !== 'kashier') throw new Error(`unexpected key ${key}`);
      return {
        merchantId: MERCHANT_ID,
        apiKey: API_KEY,
        secretKey: SECRET_KEY,
        mode: 'test' as const,
        baseUrl: 'https://checkout.kashier.io',
        display: 'en' as const,
        allowedMethods: 'card',
        enabled: true,
      };
    },
    get: (key: string, fallback: string) =>
      key === 'storefrontUrl' ? 'https://shop.example.com' : key === 'apiPublicUrl' ? 'https://api.example.com/api/v1' : fallback,
  } as unknown as ConfigService;

  return new KashierService(config);
}

describe('KashierService', () => {
  const service = buildService();

  describe('order hash', () => {
    it('signs the documented /?payment=mid.order.amount.currency path with the API key', () => {
      const expected = createHmac('sha256', API_KEY)
        .update(`/?payment=${MERCHANT_ID}.ATL-1.290.00.EGP`)
        .digest('hex');

      expect(service.buildOrderHash('ATL-1', '290.00', 'EGP')).toBe(expected);
    });

    it('changes when the amount changes, so a tampered URL cannot be paid', () => {
      const honest = service.buildOrderHash('ATL-1', '290.00', 'EGP');
      const tampered = service.buildOrderHash('ATL-1', '1.00', 'EGP');
      expect(honest).not.toBe(tampered);
    });

    it('formats minor units into the exact string it signs', () => {
      const session = service.createSession({
        merchantOrderId: 'ATL-20260814-000001',
        amountCents: 290_000,
        currency: 'EGP',
      });

      expect(session.amount).toBe('2900.00');
      expect(session.hash).toBe(service.buildOrderHash('ATL-20260814-000001', '2900.00', 'EGP'));
      expect(session.checkoutUrl).toContain('https://checkout.kashier.io/?');
      expect(session.params.serverWebhook).toBe('https://api.example.com/api/v1/payments/kashier/webhook');
      expect(session.params.merchantRedirect).toBe('https://shop.example.com/en/checkout/callback');
    });
  });

  describe('webhook verification', () => {
    const data = {
      amount: '2900.00',
      currency: 'EGP',
      merchantOrderId: 'ATL-20260814-000001',
      orderId: 'kashier-order-1',
      status: 'SUCCESS',
      transactionId: 'TX-1',
      signatureKeys: ['amount', 'currency', 'merchantOrderId', 'orderId', 'status', 'transactionId'],
    };

    const sign = (payload: typeof data) =>
      createHmac('sha256', SECRET_KEY)
        .update(payload.signatureKeys.map((key) => `${key}=${(payload as Record<string, unknown>)[key]}`).join('&'))
        .digest('hex');

    it('accepts a body signed over signatureKeys in order', () => {
      expect(service.verifyWebhook({ event: 'pay', data: { ...data, signature: sign(data) } })).toBe(true);
    });

    it('accepts the signature from the header when the body omits it', () => {
      expect(service.verifyWebhook({ event: 'pay', data }, sign(data))).toBe(true);
    });

    it('rejects a body whose amount was edited after signing', () => {
      const signature = sign(data);
      expect(service.verifyWebhook({ event: 'pay', data: { ...data, amount: '1.00', signature } })).toBe(false);
    });

    it('rejects a different key order, which produces a different digest', () => {
      const reordered = { ...data, signatureKeys: [...data.signatureKeys].reverse() };
      expect(service.verifyWebhook({ event: 'pay', data: { ...reordered, signature: sign(data) } })).toBe(false);
    });

    it('rejects a missing signature or missing keys', () => {
      expect(service.verifyWebhook({ event: 'pay', data })).toBe(false);
      expect(service.verifyWebhook({ event: 'pay', data: { signature: 'abc' } })).toBe(false);
      expect(service.verifyWebhook({})).toBe(false);
    });
  });

  describe('redirect verification', () => {
    it('signs every query param except signature and mode, sorted', () => {
      const query: Record<string, string> = {
        paymentStatus: 'SUCCESS',
        merchantOrderId: 'ATL-1',
        amount: '290.00',
        mode: 'test',
      };

      const expected = createHmac('sha256', SECRET_KEY)
        .update('amount=290.00&merchantOrderId=ATL-1&paymentStatus=SUCCESS')
        .digest('hex');

      expect(service.verifyRedirect({ ...query, signature: expected })).toBe(true);
      expect(service.verifyRedirect({ ...query, signature: 'deadbeef' })).toBe(false);
      expect(service.verifyRedirect(query)).toBe(false);
    });
  });
});
