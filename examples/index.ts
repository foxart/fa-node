import { ConsoleClass } from '../src';

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
  Array.from(Array(15).keys()).forEach(() => console.log('|'));
  const Console = new ConsoleClass({
    name: 'CONTEXT',
    color: true,
    info: true,
    counter: true,
    date: true,
    performance: true,
    link: true,
    /** */
    linkIndex: 2,
    stackErrorShow: true,
    // stackFull: true,
    /** */
    // dataSort: true,
    // dataType: true,
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
/**
 * Console Helper
 */
// void import('./services/console-service.example').then((module) => module.cryptHelperExample());
/**
 *
 */
// void import('./helpers/crypt-helper.example').then((module) => module.run());
/**
 * Converter Helper
 */
// void import('./converter-helper.example').then((module) => module.cryptHelperExample());
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
function firstUniqChar(s: string): number {
  if (s.length > 100000) {
    // throw new Error('String length exceeds the limit of 10^5');
  }
  if (!/^[a-z]+$/.test(s)) {
    // throw new Error('Only english lowercase letters are allowed.');
  }
  const letterMap = new Map();
  for (const letter of s) {
    if (letterMap.has(letter)) {
      letterMap.set(letter, letterMap.get(letter) + 1);
    } else {
      letterMap.set(letter, 0);
    }
  }
  for (let i = 0; i < s.length; i++) {
    if (letterMap.get(s[i]) === 0) {
      return i;
    }
  }
  return -1;
  /**
   *
   */
  // const charCount = new Array(26).fill(0);
  // const charCodeA = 'a'.charCodeAt(0);
  // for (const char of s) {
  //   console.log(char.charCodeAt(0));
  //   charCount[char.charCodeAt(0) - charCodeA]++;
  // }
  // console.log(charCount);
  // for (let i = 0; i < s.length; i++) {
  //   if (charCount[s.charCodeAt(i) - charCodeA] === 1) {
  //     return i;
  //   }
  // }
  // return -1;
}

// console.log(firstUniqChar('leetcode'));
// console.log(firstUniqChar('loveleetcodez'));
// const myError = new Error('my error');
// console.error(myError);
// console.trace('XXX');
// console.error(ParserHelper.stack(myError.stack));
console.log('Start');
setTimeout(() => {
  console.log('setTimeout');
}, 0);
setImmediate(() => {
  console.log('setImmediate');
});
void Promise.resolve().then(() => {
  console.log('Promise');
});
process.nextTick(() => {
  console.log('nextTick');
});
console.log('End');
