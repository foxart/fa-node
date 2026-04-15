import { ProcessHelper } from '@common/helpers/process.helper';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { environment } from './common/environment';
import { LoggerNodeService } from './common/logger-node.service';
import { PROCESS_CONFIG } from './config/process.config';

void (async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerNodeService);
  app.useLogger(logger);
  app.enableShutdownHooks();
  ProcessHelper.hook(logger, PROCESS_CONFIG(app, logger));
  const { protocol, host, port } = environment.app;
  await app.listen(port, host);
  // logger.verbose('Listening', `${protocol}://${host}:${port}`, 'MyApplication');
  logger.info('Listening', `${protocol}://${host}:${port}`, 'MyApplication');
})();
