import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ProcessHelper } from './helpers/process.helper';
import { AppModule } from './nest/app.module';
import { environment } from './nest/environment';
import { LoggerNodeService } from './nest/logger-node.service';
import { PROCESS_CONFIG } from './nest/process.config';

void (async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerNodeService);
  app.useLogger(logger);
  ProcessHelper.hook(logger, PROCESS_CONFIG);
  const { protocol, host, port } = environment.app;
  await app.listen(port, host);
  // logger.verbose('Listening', `${protocol}://${host}:${port}`, 'MyApplication');
  logger.info('Listening', `${protocol}://${host}:${port}`, 'MyApplication');
})();
