import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('apiPrefix', 'api/v1');
  const port = config.get<number>('port', 8080);
  const isProduction = config.get<boolean>('isProduction', false);
  const corsOrigins = config.get<string[]>('corsOrigins', []);

  app.setGlobalPrefix(apiPrefix);

  // Cloud Run terminates TLS at the load balancer; trust its forwarded headers
  // so rate limiting and logging see the real client IP.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // The API returns JSON only; the frontend owns CSP.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Atelier Commerce API')
      .setDescription('Clothing storefront API — products, cart, checkout and fulfilment.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${apiPrefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig));
    logger.log(`Swagger UI available at /${apiPrefix}/docs`);
  }

  app.get(PrismaService).enableShutdownHooks(app);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on port ${port} with prefix /${apiPrefix}`);
}

void bootstrap();
