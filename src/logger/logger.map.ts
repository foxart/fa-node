import { AnsiColorValueType, AnsiEffectValueType, AnsiHelper } from '@common/helpers/ansi.helper';

export enum LoggerEnum {
  DEFAULT,
  CONTEXT,
  CALLER,
  METHOD,
  LINE,
  /**
   * TYPES
   */
  STRING,
  NUMBER,
  DATE,
  TIME,
  SECOND,
  URL,
  /**
   * GROUPS
   */
  BRACKET,
  PUNCTUATION,
  SYMBOL,
  /**
   * BRACKETS
   */
  PARENTHESIS, // ()
  SQUARE_BRACKET, // []
  CURLY_BRACKET, // {}
  ANGLE_BRACKET, // <>
  /**
   * PUNCTUATION
   */
  DOT, // .
  COMMA, // ,
  COLON, // :
  SEMICOLON, // ;
  /**
   * SYMBOLS
   */
  PLUS, // +
  SLASH = 'slash', // /\
  Dash = 'dash', // -
  Pipe = 'pipe', // |
  Underscore = 'underscore', // _
  Backtick = 'backtick', // `
  Quote = 'quote', // "'
  Equals = 'equals', // =
  Asterisk = 'asterisk', // *
  Ampersand = 'ampersand', // &
  Percent = 'percent', // %
  Hash = 'hash', // #
  At = 'at', // @
}

export const LOGGER_MAP: Record<LoggerEnum, (AnsiColorValueType | AnsiEffectValueType)[]> = {
  [LoggerEnum.DEFAULT]: [],
  [LoggerEnum.CONTEXT]: [AnsiHelper.ef.bold, AnsiHelper.fg.white], // text
  [LoggerEnum.CALLER]: [AnsiHelper.ef.bold, AnsiHelper.fg.blue], // text
  [LoggerEnum.METHOD]: [AnsiHelper.ef.bold, AnsiHelper.fg.cyan], // text
  [LoggerEnum.LINE]: [AnsiHelper.ef.dim, AnsiHelper.fg.blue], // text
  /**
   * TYPES
   */
  [LoggerEnum.STRING]: [AnsiHelper.fg.green], // text
  [LoggerEnum.NUMBER]: [AnsiHelper.fg.yellow], // text
  [LoggerEnum.DATE]: [AnsiHelper.fg.magenta], // text
  [LoggerEnum.TIME]: [AnsiHelper.fg.cyan], // text
  [LoggerEnum.SECOND]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan], // text
  [LoggerEnum.URL]: [AnsiHelper.ef.bold, AnsiHelper.fg.blue], // text
  /**
   * GROUPS
   */
  [LoggerEnum.BRACKET]: [AnsiHelper.fg.white], // ()[]{}<>
  [LoggerEnum.PUNCTUATION]: [AnsiHelper.fg.white], // .,;:
  [LoggerEnum.SYMBOL]: [AnsiHelper.fg.white], // symbols
  /**
   * BRACKETS
   */
  [LoggerEnum.PARENTHESIS]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta], // ()
  [LoggerEnum.SQUARE_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta], // []
  [LoggerEnum.CURLY_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta], // {}
  [LoggerEnum.ANGLE_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta], // <>
  /**
   *  PUNCTUATIONS
   */
  [LoggerEnum.DOT]: [AnsiHelper.fg.white], // .
  [LoggerEnum.COMMA]: [AnsiHelper.fg.white], // ,
  [LoggerEnum.COLON]: [AnsiHelper.fg.white], // :
  [LoggerEnum.SEMICOLON]: [AnsiHelper.fg.white], // ;
  /**
   * SYMBOLS
   */
  [LoggerEnum.PLUS]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan], // +
  [LoggerEnum.SLASH]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan], // /
  [LoggerEnum.Dash]: [AnsiHelper.fg.white], // -
  [LoggerEnum.Pipe]: [AnsiHelper.fg.white], // |
  [LoggerEnum.Underscore]: [AnsiHelper.fg.white], // _
  [LoggerEnum.Backtick]: [AnsiHelper.fg.green], // `
  [LoggerEnum.Quote]: [AnsiHelper.fg.green], // '"
  [LoggerEnum.Equals]: [AnsiHelper.fg.white], // =
  [LoggerEnum.Asterisk]: [AnsiHelper.fg.white], // *
  [LoggerEnum.Ampersand]: [AnsiHelper.fg.white], // &
  [LoggerEnum.Percent]: [AnsiHelper.fg.white], // %
  [LoggerEnum.Hash]: [AnsiHelper.fg.white], // #
  [LoggerEnum.At]: [AnsiHelper.fg.white], // @
};
