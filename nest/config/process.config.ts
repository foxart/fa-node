import { ProcessConfigInterface } from '@common/helpers/process.helper';
import { INestApplication } from '@nestjs/common';
import { LoggerNodeService } from '../common/logger-node.service';

export const PROCESS_CONFIG = (app: INestApplication, logger: LoggerNodeService): ProcessConfigInterface => {
  let shutdownPromise: Promise<void> | null = null;

  return {
    shutdownHandler: async (signal): Promise<void> => {
      logger.warn(signal);
      logger.debug('Shutdown started', signal, 'NestProcess');
      if (!shutdownPromise) {
        shutdownPromise = app.close();
      }
      await shutdownPromise;
      logger.debug('Shutdown finished', signal, 'NestProcess');
    },
    exitHandler: (exit): void => {
      logger.debug(exit.message);
    },
    uncaughtExceptionHandler: (error): void => {
      logger.error(error, 'NestProcess');
    },
    unhandledRejectionHandler: (reason): void => {
      logger.error(reason, 'NestProcess');
    },
  };
};
