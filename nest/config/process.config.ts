import { ProcessConfigInterface, ProcessLoggerInterface } from '@common/helpers/process.helper';
import { INestApplication } from '@nestjs/common';

export const PROCESS_CONFIG = (app: INestApplication, logger: ProcessLoggerInterface): ProcessConfigInterface => {
  let shutdownPromise: Promise<void> | null = null;

  return {
    shutdownHandler: async (signal): Promise<void> => {
      logger.debug('Shutdown started', signal, 'NestProcess');

      if (!shutdownPromise) {
        shutdownPromise = app.close();
      }

      await shutdownPromise;
      logger.debug('Shutdown finished', signal, 'NestProcess');
    },
    uncaughtExceptionHandler: (error): void => {
      logger.debug('Uncaught exception observed', error, 'NestProcess');
    },
    unhandledRejectionHandler: (reason): void => {
      logger.debug('Unhandled rejection observed', reason, 'NestProcess');
    },
  };
};
