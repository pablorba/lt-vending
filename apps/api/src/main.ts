import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS: en producción se restringe a los orígenes listados en CORS_ORIGINS
  // (separados por coma). En dev acepta todo.
  const corsOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
      : true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Railway usa PORT; en local mantenemos API_PORT
  const port = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3101', 10);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`🚀 LT Vending API escuchando en http://${host}:${port}/api/v1`);
}

bootstrap();
