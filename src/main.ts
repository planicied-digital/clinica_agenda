import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { assertProductionConfig } from './config/assert-production-config';

async function bootstrap() {
  // rawBody: true — necessário pra validar a assinatura HMAC do webhook do
  // WhatsApp (WhatsappWebhookController), que precisa do corpo exato recebido,
  // não o JSON já re-serializado.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  assertProductionConfig(config);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

bootstrap();
