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
  Array.from(Array(5).keys()).forEach(() => console.log('|'));
  const Console = new ConsoleClass({
    color: true,
    info: true,
    // name: 'NAME',
    // pid: true,
    // date: true,
    // time: true,
    performance: true,
    link: true,
    /** */
    linkIndex: 2,
    stackError: true,
    stackDebug: true,
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
// void import('./services/console-service.example').then((module) => module.run());
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
void import('./helpers/migrator-helper.example').then((module) => module.run());

/**
 *
 */

function filterSubtitleList(subtitleList: string[]): string[] {
  const excludedPatterns = [
    // RU
    /субтитр(а|у|ом|е|ы|ов|ам|ами|ах)?/i,
    /и так далее/i,
    /продолжение следует/i,
    /следующ(ее|его|ему|им|ем)? обновлени(е|я|ю|ем|и)?/i,
    /мо(й|его|ему|им|ем|ём)? канал(а|у|ом|е)?/i,
    // EN
    /subtitle(s)?/i,
    /and so on/i,
    /to be continued/i,
    /(next)? update(s)?/i,
    /my channel/i,
    // DE
    /untertitel([ns])?/i,
    /und so weiter/i,
    /fortsetzung folgt/i,
    /nächst(es|en|em|er)? update(s)?/i,
    /mein(en|em|es|e)? kanal(s|es|e|en)?/i,
    // FR
    /sous-titre(s)?/i,
    /et ainsi de suite/i,
    /à suivre/i,
    /(prochain(e|es)?)? mise(s)? à jour/i,
    /m(a|on|es)? chaîne(s)?/i,
  ];
  return subtitleList.filter((subtitle) => {
    return !excludedPatterns.some((pattern) => pattern.test(subtitle));
  });
}

const testArray = [
  // Russian phrases for subtitles
  'Эти субтитры были переведены специально для вас.',
  'У вас отсутствуют субтитры к фильму.',
  'Я добавлю субтитры к этому видео позже.',
  'Этих субтитров совершенно не хватает!',
  'Можете ли вы помочь с субтитрами к этому видео?',
  // Continuation or progression phrases
  'Продолжение следует где-то в ближайшем будущем.',
  'На этом история не заканчивается — продолжение следует!',
  'Продолжение следует завтра, не переключайтесь!',
  // Update-related phrases
  'Увидимся в следующем обновлении, оно будет скоро.',
  'Спасибо за внимание, увидимся в следующем обновлении!',
  'Следующая большая новость будет в следующем обновлении.',
  // Channel gratitude
  'Я так рада, что вы зашли на мой канал, подпишитесь, если хотите больше!',
  'Я так рад, что вы посетили мой канал, это значит для меня многое.',
  'Огромное спасибо, что зашли на мой канал, приглашаю вас остаться!',
];
// console.log(filterSubtitleList(testArray));
