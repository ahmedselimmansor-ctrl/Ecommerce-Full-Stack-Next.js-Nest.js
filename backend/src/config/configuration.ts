import { z } from 'zod';

/**
 * Environment contract. Anything the app reads at runtime is declared here so a
 * misconfigured Cloud Run revision fails fast at boot instead of at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  API_PREFIX: z.string().default('api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(120),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  GCS_BUCKET: z.string().default(''),
  GCS_PUBLIC_BASE_URL: z.string().default(''),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),

  // ---- RabbitMQ (Message Queue) ----
  RABBITMQ_HOST: z.string().default('localhost'),
  RABBITMQ_PORT: z.coerce.number().int().positive().default(5672),
  RABBITMQ_USER: z.string().default('rabbitmq'),
  RABBITMQ_PASSWORD: z.string().default('rabbitmq'),
  RABBITMQ_EXCHANGE: z.string().default('atelier_events'),
  RABBITMQ_CONNECTION_RETRY_DELAY: z.coerce.number().int().positive().default(1000),

  // ---- Kashier (Egyptian payment gateway) ----
  KASHIER_MERCHANT_ID: z.string().default(''),
  KASHIER_API_KEY: z.string().default(''),
  KASHIER_SECRET_KEY: z.string().default(''),
  KASHIER_MODE: z.enum(['test', 'live']).default('test'),
  KASHIER_BASE_URL: z.string().default('https://checkout.kashier.io'),
  KASHIER_DISPLAY: z.enum(['en', 'ar']).default('en'),
  KASHIER_ALLOWED_METHODS: z.string().default('card,wallet'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  STOREFRONT_URL: z.string().default('http://localhost:3000'),
  // The API's own internet-facing URL. Kashier calls the webhook server-to-server,
  // so it must reach the API directly rather than through the storefront.
  API_PUBLIC_URL: z.string().default('http://localhost:8080/api/v1'),
  CURRENCY: z.string().default('EGP'),
  FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().nonnegative().default(150000),
  FLAT_SHIPPING_CENTS: z.coerce.number().int().nonnegative().default(6000),
});

export type AppConfig = ReturnType<typeof configuration>;

export function validateEnv(raw: Record<string, unknown>) {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export function configuration() {
  const env = validateEnv(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    storefrontUrl: env.STOREFRONT_URL.replace(/\/$/, ''),
    apiPublicUrl: env.API_PUBLIC_URL.replace(/\/$/, ''),
    currency: env.CURRENCY,
    kashier: {
      merchantId: env.KASHIER_MERCHANT_ID,
      apiKey: env.KASHIER_API_KEY,
      // Webhooks are signed with the secret (iframe) key when one is issued;
      // merchants without a separate secret sign with the API key.
      secretKey: env.KASHIER_SECRET_KEY || env.KASHIER_API_KEY,
      mode: env.KASHIER_MODE,
      baseUrl: env.KASHIER_BASE_URL.replace(/\/$/, ''),
      display: env.KASHIER_DISPLAY,
      allowedMethods: env.KASHIER_ALLOWED_METHODS,
      enabled: Boolean(env.KASHIER_MERCHANT_ID && env.KASHIER_API_KEY),
    },
    database: { url: env.DATABASE_URL },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      tls: env.REDIS_TLS,
      ttlSeconds: env.CACHE_TTL_SECONDS,
    },
    rabbitmq: {
      host: env.RABBITMQ_HOST,
      port: env.RABBITMQ_PORT,
      user: env.RABBITMQ_USER,
      password: env.RABBITMQ_PASSWORD,
      exchange: env.RABBITMQ_EXCHANGE,
      connectionRetryDelay: env.RABBITMQ_CONNECTION_RETRY_DELAY,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    storage: {
      bucket: env.GCS_BUCKET,
      publicBaseUrl: env.GCS_PUBLIC_BASE_URL || (env.GCS_BUCKET ? `https://storage.googleapis.com/${env.GCS_BUCKET}` : ''),
      projectId: env.GOOGLE_CLOUD_PROJECT,
    },
    shipping: {
      freeThresholdCents: env.FREE_SHIPPING_THRESHOLD_CENTS,
      flatCents: env.FLAT_SHIPPING_CENTS,
    },
  };
}
