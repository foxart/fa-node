import { ConsoleSystemClass } from '../src';

export function initCatch(): void {
  process.on('uncaughtException', (error) => {
    console.error('uncaughtException', error);
  });
  process.on('unhandledRejection', (reason, promise) => {
    void promise.catch(() => {
      console.error('unhandledRejection', reason);
    });
  });
}

export function initConsole(): void {
  Array.from(Array(5).keys()).forEach(() => console.log('|'));
  const Console = new ConsoleSystemClass({
    color: true,
    info: true,
    // name: 'NAME',
    // pid: true,
    date: true,
    time: true,
    performance: true,
    link: true,
    /** */
    linkIndex: 2,
    stackError: true,
    stackDebug: true,
    /** */
    sort: true,
  });
  console.log = (...args: unknown[]): void => {
    Console.log(...args);
    process.stdout.write('\n');
  };
  console.info = (...args: unknown[]): void => {
    Console.info(...args);
    process.stdout.write('\n');
  };
  console.warn = (...args: unknown[]): void => {
    Console.warn(...args);
    process.stdout.write('\n');
  };
  console.error = (...args: unknown[]): void => {
    Console.error(...args);
    process.stdout.write('\n');
  };
  console.debug = (...args: unknown[]): void => {
    Console.debug(...args);
    process.stdout.write('\n');
  };
}

initCatch();
initConsole();
console.clear();
/**
 * Console Helper
 */
// void import('./services/console-service.example').then((module) => module.run());
/**
 * Converter Helper
 */
// void import('./converter-helper.example').then((module) => module.cryptHelperExample());
/**
 * Crypt Helper
 */
void import('./helpers/crypt-helper.example').then((module) => module.run());

/**
 * Parser Helper
 */
// void import('./helpers/parser-helper.example').then((module) => module.cryptHelperExample());
/**
 * Decorator Service
 */
// void import('./services/decorator-service.example').then((module) => module.runSync());
// void import('./services/decorator-service.example').then((module) => module.runAsync());
/**
 * Exception Service
 */
// void import('./services/exception-service.example').then((module) => module.cryptHelperExample());
/**
 * Validator Service
 */
// void import('./services/validator-service.example').then((module) => module.cryptHelperExample());
/**
 *
 */
// void import('./helpers/data-helper.example').then((module) => module.run());
/**
 *
 */
// void import('./helpers/configuration-helper.example').then((module) => module.run());
/**
 *
 */
// setTimeout(() => {
// void import('./helpers/migration-mongo-helper.example').then((module) => module.run());
// }, 500);
/**
 *
 */
// const error = new Error('Error');
// console.log(error);
// console.log({ error });
