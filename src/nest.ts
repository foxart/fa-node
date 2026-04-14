import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hookToProcess } from './helpers/process.helper';
import { AppModule } from './nest/app.module';
import { LoggerNestService } from './nest/logger-nest.service';

void (async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerNestService);
  hookToProcess(logger, {
    exitSignals: ['SIGTERM', 'SIGINT'],
    logOnlySignals: ['SIGHUP', 'SIGABRT'],
    handleErrors: true,
    handleExit: true,
  });
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 3000);
  logger.verbose('Listening', await app.getUrl(), 'MyApplication');
})();
