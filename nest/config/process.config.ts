import { INestApplication, LoggerService } from '@nestjs/common';
import { ProcessConfigInterface } from '../../src';

export const PROCESS_CONFIG = (app: INestApplication, logger: LoggerService): ProcessConfigInterface => {
  let shutdownPromise: Promise<void> | null = null;

  return {
    shutdownHandler: async (signal): Promise<void> => {
      logger.error(signal);
      logger.warn('Shutdown started', signal, 'NestProcess');
      if (!shutdownPromise) {
        shutdownPromise = app.close();
      }
      await shutdownPromise;
      logger.warn('Shutdown finished', signal, 'NestProcess');
      //
    },
    exitHandler: (exit): void => {
      logger.warn(exit.message);
    },
    uncaughtExceptionHandler: (error): void => {
      logger.error(error, 'NestProcess');
    },
    unhandledRejectionHandler: (reason): void => {
      logger.error(reason, 'NestProcess');
    },
  };
};
