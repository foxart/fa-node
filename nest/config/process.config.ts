import { ProcessConfigInterface, ProcessLoggerInterface } from '@common/helpers/process.helper';
import { INestApplication } from '@nestjs/common';

export const createProcessConfig = (app: INestApplication, logger: ProcessLoggerInterface): ProcessConfigInterface => {
  let shutdownPromise: Promise<void> | null = null;

  return {
    handleErrors: true,
    handleExit: true,
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false,
    shutdownHandler: async (signal): Promise<void> => {
      shutdownPromise ??= (async (): Promise<void> => {
        logger.debug('Shutdown started', signal, 'NestProcess');
        await app.close();
        logger.debug('Shutdown finished', signal, 'NestProcess');
      })();

      await shutdownPromise;
    },
  };
};
