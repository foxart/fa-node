import { AnsiColorValueType, AnsiEffectValueType, AnsiHelper } from '../helpers/ansi.helper';
import { LoggerTokenType } from './logger.class';

export const LOGGER_MAP: Record<LoggerTokenType, (AnsiColorValueType | AnsiEffectValueType)[]> = {
  [LoggerTokenType.DEFAULT]: [],
  [LoggerTokenType.CONTEXT]: [AnsiHelper.ef.bold, AnsiHelper.fg.white],
  [LoggerTokenType.CALLER]: [AnsiHelper.ef.bold, AnsiHelper.fg.blue],
  [LoggerTokenType.METHOD]: [AnsiHelper.ef.bold, AnsiHelper.fg.cyan],
  [LoggerTokenType.LINE]: [AnsiHelper.ef.dim, AnsiHelper.fg.blue],
  /**
   *
   */
  [LoggerTokenType.STRING]: [AnsiHelper.fg.green],
  [LoggerTokenType.NUMBER]: [AnsiHelper.fg.yellow],
  [LoggerTokenType.DATE]: [AnsiHelper.fg.magenta],
  [LoggerTokenType.TIME]: [AnsiHelper.fg.cyan],
  [LoggerTokenType.SECOND]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan],
  [LoggerTokenType.URL]: [AnsiHelper.ef.bold, AnsiHelper.fg.blue],
  [LoggerTokenType.BRACKET]: [AnsiHelper.fg.white],
  [LoggerTokenType.PUNCTUATION]: [AnsiHelper.fg.white],
  [LoggerTokenType.SYMBOL]: [AnsiHelper.fg.white],

  // punctuation
  [LoggerTokenType.DOT]: [AnsiHelper.fg.white],
  [LoggerTokenType.COMMA]: [AnsiHelper.fg.white],
  [LoggerTokenType.COLON]: [AnsiHelper.fg.white],
  [LoggerTokenType.SEMICOLON]: [AnsiHelper.fg.white],

  // brackets
  [LoggerTokenType.PARENTHESIS]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta],
  [LoggerTokenType.SQUARE_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta],
  [LoggerTokenType.CURLY_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta],
  [LoggerTokenType.ANGLE_BRACKET]: [AnsiHelper.ef.bold, AnsiHelper.fg.magenta],

  // symbols
  [LoggerTokenType.PLUS]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan],
  [LoggerTokenType.SLASH]: [AnsiHelper.ef.dim, AnsiHelper.fg.cyan],
  [LoggerTokenType.Dash]: [AnsiHelper.fg.white],
  [LoggerTokenType.Pipe]: [AnsiHelper.fg.white],
  [LoggerTokenType.Underscore]: [AnsiHelper.fg.white],
  [LoggerTokenType.Backtick]: [AnsiHelper.fg.green],
  [LoggerTokenType.Quote]: [AnsiHelper.fg.green],
  [LoggerTokenType.Equals]: [AnsiHelper.fg.white],
  [LoggerTokenType.Asterisk]: [AnsiHelper.fg.white],
  [LoggerTokenType.Ampersand]: [AnsiHelper.fg.white],
  [LoggerTokenType.Percent]: [AnsiHelper.fg.white],
  [LoggerTokenType.Hash]: [AnsiHelper.fg.white],
  [LoggerTokenType.At]: [AnsiHelper.fg.white],
};
