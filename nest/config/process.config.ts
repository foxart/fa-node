import { ProcessConfigInterface } from '../../src/helpers/process.helper';

export const PROCESS_CONFIG: ProcessConfigInterface = {
  exitSignals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
  logOnlySignals: ['SIGHUP', 'SIGABRT'],
  handleErrors: true,
  handleExit: true,
  exitOnSignal: true,
  exitOnUncaughtException: false,
  exitOnUnhandledRejection: false,
};
