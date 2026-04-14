import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './nest/app.module';
import { LoggerNestService } from './nest/logger-nest.service';

void (async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerNestService);
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 3000);
  logger.verbose('Listening', await app.getUrl(), 'MyApplication');
})();
