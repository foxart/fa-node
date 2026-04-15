import os from 'node:os';
import { ProcessConfigInterface } from '@common/helpers/process.helper';
import { INestApplication } from '@nestjs/common';
import { LoggerNodeService } from '../common/logger-node.service';

const signalByExitCodeMap = new Map<number, NodeJS.Signals>();
for (const signal of [
  'SIGABRT',
  'SIGALRM',
  'SIGHUP',
  'SIGINT',
  'SIGKILL',
  'SIGPIPE',
  'SIGQUIT',
  'SIGSEGV',
  'SIGTERM',
  'SIGTRAP',
] as const) {
  signalByExitCodeMap.set(128 + os.constants.signals[signal], signal);
}

const describeExitCode = (code: number): string => {
  const signal = signalByExitCodeMap.get(code);

  switch (code) {
    case 0:
      return 'Exited with code 0 (success)';
    case 1:
      return 'Exited with code 1 (general error)';
    default:
      return signal ? `Exited with code ${code} (signal-derived: ${signal})` : `Exited with code ${code}`;
  }
};

export const PROCESS_CONFIG = (app: INestApplication, logger: LoggerNodeService): ProcessConfigInterface => {
  let shutdownPromise: Promise<void> | null = null;

  return {
    signalHandler: (signal): void => {
      logger.warn(signal);
    },
    shutdownHandler: async (signal): Promise<void> => {
      logger.debug('Shutdown started', signal, 'NestProcess');

      if (!shutdownPromise) {
        shutdownPromise = app.close();
      }

      await shutdownPromise;
      logger.debug('Shutdown finished', signal, 'NestProcess');
    },
    exitHandler: (code): void => {
      logger.debug(describeExitCode(code));
    },
    uncaughtExceptionHandler: (error): void => {
      logger.error(error, 'NestProcess');
    },
    unhandledRejectionHandler: (reason): void => {
      logger.error(reason, 'NestProcess');
    },
  };
};
//
