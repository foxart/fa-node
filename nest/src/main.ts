import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

void (async function bootstrap(): Promise<void> {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerSystemService);
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 3000);
})();
