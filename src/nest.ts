import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ProcessHelper } from './helpers/process.helper';
import { AppModule } from './nest/app.module';
import { LoggerNestService } from './nest/logger-nest.service';

void (async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerNestService);
  ProcessHelper.hook(logger, {
    exitSignals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
    logOnlySignals: ['SIGHUP', 'SIGABRT'],
    handleErrors: true,
    handleExit: true,
    exitOnSignal: true,
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false,
  });
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 8888);
  logger.verbose('Listening', await app.getUrl(), 'MyApplication');
})();
