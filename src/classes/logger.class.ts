import * as util from 'node:util';
import {
  AnsiBackgroundValueType,
  AnsiColorKeyType,
  AnsiEffectKeyType,
  AnsiEffectValueType,
  AnsiForegroundValueType,
  AnsiHelper,
} from '../helpers/ansi.helper';

function safePush(list: string[], value: string | undefined): void {
  if (value) {
    list.push(value);
  }
}

export interface LoggerOptionsInterface {
  color?: boolean;
  level?: boolean;
  env?: string;
  pid?: boolean;
  date?: boolean;
  time?: boolean;
  metadata?: boolean;
  performance?: boolean;
  link?: boolean;
  traceIndex?: number;
  errorStack?: boolean;
  stackDebug?: boolean;
  sort?: boolean;
  hidden?: boolean;
  maxDepth?: number;
  maxArrayLength?: number;
}

export interface LoggerTraceFrameInterface {
  file: string;
  caller: string;
  method?: string;
  line?: number;
  column?: number;
}

export interface LoggerOriginInterface {
  frame?: LoggerTraceFrameInterface;
  visible: boolean;
}

export interface LoggerMetadataInterface {
  caller: string;
  method?: string;
  linkFile?: string;
}

export interface LoggerMetadataOutputOptionsInterface {
  callerOverride?: string;
  hideMethodSet?: ReadonlySet<string>;
}

export interface LoggerRenderOutputOptionsInterface {
  level: LoggerLevelType;
  metadata: LoggerMetadataInterface | undefined;
  messages: unknown[];
  debugTrace: LoggerTraceFrameInterface[];
  formatString?: (value: string) => string;
}

export type LoggerLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export enum LoggerTokenType {
  DEFAULT,
  CONTEXT,
  CALLER,
  METHOD,
  LINE,
  /**
   * STRING, NUMBER, DATE, TIME, SECOND, INFO, URL, BRACKET, PUNCTUATION, SYMBOL
   */
  STRING,
  NUMBER,
  DATE,
  TIME,
  SECOND,
  URL,
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

interface ArrowInterface {
  left: string;
  up: string;
  right: string;
  down: string;
}

interface StatusInterface {
  success: string;
  error: string;
  warning: string;
}

const ARROW: ArrowInterface = {
  left: '\u2190', // ←
  up: '\u2191', // ↑
  right: '\u2192', // →
  down: '\u2193', // ↓
};

const STATUS: StatusInterface = {
  success: '\u2714', // ✔
  error: '\u2716', // ✖
  warning: '\u26A0', // ⚠
};

const SYMBOL: StatusInterface & { separator: string } = {
  ...STATUS,
  separator: '\u2503', // ┃
};

type AnsiCode = AnsiColorKeyType | AnsiEffectKeyType;
type AnsiColorName = keyof AnsiForegroundValueType | keyof AnsiBackgroundValueType;

type PipeLike = {
  pipe?: (...args: unknown[]) => unknown;
};

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isBufferLike(value: unknown): value is Buffer {
  return typeof Buffer !== 'undefined' && Buffer.isBuffer(value);
}

function isTypedArrayLike(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value);
}

function isDateLike(value: unknown): value is Date {
  return value instanceof Date;
}

function isRegExpLike(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

function isUrlLike(value: unknown): value is URL {
  return typeof URL !== 'undefined' && value instanceof URL;
}

function isPipeLike(value: unknown): value is PipeLike {
  return isObjectLike(value) && 'pipe' in value && typeof (value as PipeLike).pipe === 'function';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObjectLike(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

// Trace-related helpers
function normalizeTraceFilePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function isNodeModuleTraceFile(file: string): boolean {
  return normalizeTraceFilePath(file).includes('node_modules/');
}

function isNodeInternalTraceFile(file: string): boolean {
  const normalizedFile = normalizeTraceFilePath(file);
  return normalizedFile.startsWith('internal/') || normalizedFile.startsWith('node:');
}

function isRuntimeTraceCaller(caller: string): boolean {
  return caller === 'process' || caller === 'Module' || caller === 'Function';
}

function isAnonymousTraceFrame(caller: string, method: string): boolean {
  return caller === '<anonymous>' || (caller.length === 0 && method.length === 0);
}

function isNativeTraceFile(file: string): boolean {
  return file === 'native';
}

const EFFECT_ON: AnsiEffectValueType = AnsiHelper.ef;
const FOREGROUND_ON: AnsiForegroundValueType = AnsiHelper.fg;
const BACKGROUND_ON: AnsiBackgroundValueType = AnsiHelper.bg;
// const EFFECT_OFF: AnsiEffectInterface = createOff(EFFECT_ON);
// const FOREGROUND_OFF: AnsiColorInterface = createOff(FOREGROUND_ON);
// const BACKGROUND_OFF: AnsiColorInterface = createOff(BACKGROUND_ON);

const LEVEL_COLOR_MAP: Record<LoggerLevelType, AnsiColorName> = {
  LOG: 'green',
  INF: 'blue',
  WRN: 'yellow',
  ERR: 'red',
  DBG: 'magenta',
  FTL: 'red',
};

const TOKEN_COLOR_MAP: Record<LoggerTokenType, AnsiCode[]> = {
  [LoggerTokenType.DEFAULT]: [],
  [LoggerTokenType.CONTEXT]: [EFFECT_ON.bold, FOREGROUND_ON.white],
  [LoggerTokenType.CALLER]: [EFFECT_ON.bold, FOREGROUND_ON.blue],
  [LoggerTokenType.METHOD]: [EFFECT_ON.bold, FOREGROUND_ON.cyan],
  [LoggerTokenType.LINE]: [EFFECT_ON.dim, FOREGROUND_ON.blue],
  /**
   *
   */
  [LoggerTokenType.STRING]: [FOREGROUND_ON.green],
  [LoggerTokenType.NUMBER]: [FOREGROUND_ON.yellow],
  [LoggerTokenType.DATE]: [FOREGROUND_ON.magenta],
  [LoggerTokenType.TIME]: [FOREGROUND_ON.cyan],
  [LoggerTokenType.SECOND]: [EFFECT_ON.dim, FOREGROUND_ON.cyan],
  [LoggerTokenType.URL]: [EFFECT_ON.bold, FOREGROUND_ON.blue],
  [LoggerTokenType.BRACKET]: [FOREGROUND_ON.white],
  [LoggerTokenType.PUNCTUATION]: [FOREGROUND_ON.white],
  [LoggerTokenType.SYMBOL]: [FOREGROUND_ON.white],

  // punctuation
  [LoggerTokenType.DOT]: [FOREGROUND_ON.white],
  [LoggerTokenType.COMMA]: [FOREGROUND_ON.white],
  [LoggerTokenType.COLON]: [FOREGROUND_ON.white],
  [LoggerTokenType.SEMICOLON]: [FOREGROUND_ON.white],

  // brackets
  [LoggerTokenType.PARENTHESIS]: [EFFECT_ON.bold, FOREGROUND_ON.magenta],
  [LoggerTokenType.SQUARE_BRACKET]: [EFFECT_ON.bold, FOREGROUND_ON.magenta],
  [LoggerTokenType.CURLY_BRACKET]: [EFFECT_ON.bold, FOREGROUND_ON.magenta],
  [LoggerTokenType.ANGLE_BRACKET]: [EFFECT_ON.bold, FOREGROUND_ON.magenta],

  // symbols
  [LoggerTokenType.PLUS]: [EFFECT_ON.dim, FOREGROUND_ON.cyan],
  [LoggerTokenType.SLASH]: [EFFECT_ON.dim, FOREGROUND_ON.cyan],
  [LoggerTokenType.Dash]: [FOREGROUND_ON.white],
  [LoggerTokenType.Pipe]: [FOREGROUND_ON.white],
  [LoggerTokenType.Underscore]: [FOREGROUND_ON.white],
  [LoggerTokenType.Backtick]: [FOREGROUND_ON.green],
  [LoggerTokenType.Quote]: [FOREGROUND_ON.green],
  [LoggerTokenType.Equals]: [FOREGROUND_ON.white],
  [LoggerTokenType.Asterisk]: [FOREGROUND_ON.white],
  [LoggerTokenType.Ampersand]: [FOREGROUND_ON.white],
  [LoggerTokenType.Percent]: [FOREGROUND_ON.white],
  [LoggerTokenType.Hash]: [FOREGROUND_ON.white],
  [LoggerTokenType.At]: [FOREGROUND_ON.white],
};

const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');
const TOKEN_SEPARATOR_CHARS = `()[]{}<>,:;./`;
const UPPERCASE_CHAR_REGEXP = /[A-Z]/;
const NUMBER_CHAR_REGEXP = /[0-9]/;
const NUMBER_PART_CHAR_REGEXP = /[0-9.]/;

export class LoggerClass {
  public readonly ef: AnsiEffectValueType;
  public readonly fg: AnsiForegroundValueType;
  public readonly bg: AnsiBackgroundValueType;
  public readonly arrow: ArrowInterface;
  public readonly status: StatusInterface;
  protected readonly pid = process.pid.toString();
  protected readonly startedAt = performance.now();
  protected readonly options: LoggerOptionsInterface;
  protected readonly colorEnabled: boolean;

  public constructor(options: LoggerOptionsInterface) {
    const normalizedOptions: LoggerOptionsInterface = {
      metadata: false,
      ...options,
    };
    const colorEnabled = Boolean(normalizedOptions.color);
    this.options = normalizedOptions;
    this.colorEnabled = colorEnabled;
    this.ef = EFFECT_ON;
    this.fg = FOREGROUND_ON;
    this.bg = BACKGROUND_ON;
    this.arrow = ARROW;
    this.status = STATUS;
  }

  public resolveCaller(frame: LoggerTraceFrameInterface | undefined): string {
    if (frame?.caller && frame.caller !== '<anonymous>') {
      return frame.caller;
    }
    const file = frame?.file;
    if (!file) {
      return 'unknown';
    }
    const base = file.split(/[\\/]/).pop();
    if (!base) {
      return 'unknown';
    }
    const stem = base.replace(/\.[^/.]+$/, '');
    if (!stem) {
      return 'unknown';
    }
    return stem
      .split(/[._-]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
  // private isStackDebug(level: LoggerLevelType): boolean =()=> {
  //   return level === 'DBG' && !!this.options.stackDebug;
  // }

  public buildRenderMetadata(
    origin: LoggerOriginInterface | undefined,
    options: LoggerMetadataOutputOptionsInterface = {},
  ): LoggerMetadataInterface | undefined {
    const frame = origin?.frame;
    if (!frame) {
      return undefined;
    }
    const caller = options.callerOverride ?? this.resolveCaller(frame);
    const method = frame.method && options.hideMethodSet?.has(frame.method) ? undefined : frame.method;
    return {
      caller,
      method,
      linkFile: origin?.visible ? this.formatTraceFrameLocation(frame) : undefined,
    };
  }

  public resolveOrigin(stack = '', level = 0): LoggerOriginInterface {
    return this.resolveOriginFromTrace(this.stackToTrace(stack), level);
  }

  /**
   * timestamp
   * level
   * message
   * service
   * env
   * pid: 123,
   * traceId
   * spanId
   * context: {},
   */

  protected stdout(options: LoggerRenderOutputOptionsInterface): void {
    const { level, metadata, messages, debugTrace, formatString } = options;
    const parts: string[] = [];
    // inline header rendering (previously getHeader)
    const headerParts: string[] = [];
    safePush(headerParts, this.renderTimestamp());
    safePush(headerParts, this.renderLevel(level));
    safePush(headerParts, this.renderMetadata(metadata));
    safePush(headerParts, this.renderEnv(level));
    safePush(headerParts, this.renderPid());
    safePush(parts, headerParts.join(' '));
    safePush(parts, ' :: ');
    safePush(
      parts,
      this.formatMessageList(
        messages,
        (trace) => this.formatTraceBlock('ERR', trace),
        (value) => this.utilInspect(value),
        formatString,
      ),
    );
    safePush(parts, this.renderDebug(level, debugTrace, !!this.options.stackDebug && level === 'DBG'));
    safePush(parts, this.renderPerformance(level));
    const link = this.renderLink(level, metadata?.linkFile);
    if (link) {
      safePush(parts, '\n');
      safePush(parts, link);
    }
    safePush(parts, '\n');
    const data = parts.join('');
    try {
      process.stdout.write(data);
    } catch (e) {
      this.stdoutCatch(data, e as Error);
    }
  }

  protected stdoutCatch(data: unknown, error: Error): void {
    const message = '---------------[LOGGER STDOUT ERROR]---------------';
    process.stderr.write('\n');
    // process.stderr.write(this.applyColor(message, [this.effect.bold, this.foreground.red]));
    process.stderr.write('\n');
    // process.stderr.write(this.applyColor('Source: ', [this.effect.dim]));
    // process.stderr.write(this.applyColor(this.constructor.name, [this.foreground.yellow]));
    process.stderr.write('\n');
    // process.stderr.write(this.applyColor('Error: ', [this.effect.dim]));
    // process.stderr.write(this.applyColor(error.name, [this.effect.bold, this.foreground.red]));
    // process.stderr.write(this.applyColor(': ', [this.effect.dim]));
    // process.stderr.write(this.applyColor(error.message, [this.effect.reset]));
    process.stderr.write('\n');
    if (error.stack) {
      const trace = this.getVisibleTraceItems(this.stackToTrace(error.stack));
      if (trace.length) {
        // process.stderr.write(this.applyColor('Stack trace:', [this.effect.bold, this.foreground.magenta]));
        process.stderr.write('\n');

        // force render full trace ignoring logger options
        const traceBlock = this.formatTraceBlock('ERR', trace);
        process.stderr.write(traceBlock);
        process.stderr.write('\n');
      }
    }
    // process.stderr.write(this.applyColor('Original payload:', [this.effect.bold, this.foreground.magenta]));
    process.stderr.write('\n');
    process.stderr.write(this.utilInspect(data));
    process.stderr.write('\n');
    // process.stderr.write(this.applyColor('-'.repeat(message.length), [this.foreground.red]));
    process.stderr.write('\n');
    process.exit(1);
  }

  protected stackToTrace(stack = ''): LoggerTraceFrameInterface[] {
    if (!stack) {
      return [];
    }
    const root = process.cwd();
    const result: LoggerTraceFrameInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      const location = match[2];
      const locationMatch = /^(.*):(\d+):(\d+)$/.exec(location);
      let file = locationMatch?.[1] ?? location;
      if (root && file.startsWith(root)) {
        file = file.slice(root.length).replace(/^\/|\/$/g, '') || '.';
      } else {
        file = file.replace(/^\/|\/$/g, '');
      }
      result.push({
        caller,
        method,
        file,
        line: locationMatch ? Number(locationMatch[2]) : undefined,
        column: locationMatch ? Number(locationMatch[3]) : undefined,
      });
    }
    return result;
  }

  protected resolveOriginFromTrace(trace: LoggerTraceFrameInterface[], level: number): LoggerOriginInterface {
    const visibleFrame = trace.slice(level).find((item) => this.isVisibleTraceItem(item));
    if (visibleFrame) {
      return {
        frame: this.cloneTraceFrame(visibleFrame),
        visible: true,
      };
    }
    const fallbackFrame =
      trace[level] ??
      trace.slice(level).find((item) => {
        return item.file || item.caller || item.method;
      });
    if (!fallbackFrame) {
      return { visible: false };
    }
    return {
      frame: this.cloneTraceFrame(fallbackFrame),
      visible: false,
    };
  }

  protected formatMessageList(
    messages: unknown[],
    renderTrace: (trace: LoggerTraceFrameInterface[]) => string,
    prettify: (value: unknown) => string,
    formatString?: (value: string) => string,
  ): string {
    return messages
      .map((message) => {
        return this.formatMessageValue(message, renderTrace, prettify, formatString);
      })
      .join(' ');
  }

  protected colorizeString(message: string, baseType: LoggerTokenType): string {
    if (!this.options.color) {
      return message;
    }
    const applySymbol = (value: string): string => {
      switch (value) {
        case '"':
        case "'":
        case '{':
        case '}':
        case '[':
        case ']':
        case '(':
        case ')':
          return this.render(LoggerTokenType.PUNCTUATION, value);
        case '/':
          return this.render(LoggerTokenType.SLASH, value);
        case ',':
          return this.render(LoggerTokenType.COMMA, value);
        case ':':
          return this.render(LoggerTokenType.COLON, value);
        case ';':
          return this.render(LoggerTokenType.SEMICOLON, value);
        case '.':
          return this.render(LoggerTokenType.DOT, value);
        default:
          return this.render(baseType, value);
      }
    };
    let out = '';
    let mode: 'normal' | 'single' | 'double' = 'normal';
    for (let index = 0; index < message.length; index++) {
      const char = message[index];
      // preserve marker characters (used by colorizeWithBase)
      if (char === '\u0000') {
        out += char;
        continue;
      }
      const isString = mode === 'single' || mode === 'double';
      if (char === "'" && mode !== 'double') {
        mode = mode === 'single' ? 'normal' : 'single';
        out += this.render(LoggerTokenType.PUNCTUATION, char);
        continue;
      }
      if (char === '"' && mode !== 'single') {
        mode = mode === 'double' ? 'normal' : 'double';
        out += this.render(LoggerTokenType.PUNCTUATION, char);
        continue;
      }
      if (isString && char !== '"' && char !== "'") {
        out += this.render(LoggerTokenType.STRING, char);
        continue;
      }
      // removed HTTP method detection here
      if (mode === 'normal' && UPPERCASE_CHAR_REGEXP.test(char)) {
        let word = char;
        while (index + 1 < message.length && UPPERCASE_CHAR_REGEXP.test(message[index + 1])) {
          word += message[++index];
        }
        out += this.render(baseType, word);
        continue;
      }
      if (mode === 'normal' && NUMBER_CHAR_REGEXP.test(char)) {
        let number = char;
        while (index + 1 < message.length && NUMBER_PART_CHAR_REGEXP.test(message[index + 1])) {
          number += message[++index];
        }
        out += this.render(LoggerTokenType.NUMBER, number);
        continue;
      }
      if (mode === 'normal' && TOKEN_SEPARATOR_CHARS.includes(char)) {
        out += applySymbol(char);
        continue;
      }
      out += applySymbol(char);
    }
    return out + this.ef.reset;
  }

  protected formatTraceBlock(level: LoggerLevelType, trace: LoggerTraceFrameInterface[]): string {
    const linkList = this.getVisibleTraceItems(trace)
      .map((item) => {
        return [
          '    ',
          this.renderLink(level, this.formatTraceFrameLocation(item)),
          //
        ].join('');
      })
      .join('\n');
    return [
      this.render(LoggerTokenType.PUNCTUATION, '{'),
      '\n',
      linkList,
      '\n',
      this.render(LoggerTokenType.PUNCTUATION, '}'),
    ].join('');
  }

  protected render(token: LoggerTokenType, data: string): string {
    return this.applyToken(token, data);
  }

  /**
   * timestamp
   * level
   * message
   * service
   * env
   * pid: 123,
   * traceId
   * spanId
   * context: {},
   */

  private renderTimestamp(withMilliseconds = true): string | undefined {
    const { date, time } = this.options;
    if (!date && !time) {
      return undefined;
    }
    const datetime = new Date();
    const parts = [];
    if (date) {
      const year = this.pad(datetime.getFullYear());
      const month = this.pad(datetime.getMonth() + 1);
      const day = this.pad(datetime.getDate());
      parts.push(this.applyToken(LoggerTokenType.DATE, year));
      parts.push(this.applyToken(LoggerTokenType.PUNCTUATION, '/'));
      parts.push(this.applyToken(LoggerTokenType.DATE, month));
      parts.push(this.applyToken(LoggerTokenType.PUNCTUATION, '/'));
      parts.push(this.applyToken(LoggerTokenType.DATE, day));
    }
    if (time) {
      if (date) {
        parts.push(' ');
      }
      const hours = this.pad(datetime.getHours());
      const minutes = this.pad(datetime.getMinutes());
      const seconds = this.pad(datetime.getSeconds());
      parts.push(this.applyToken(LoggerTokenType.TIME, hours));
      parts.push(this.applyToken(LoggerTokenType.PUNCTUATION, ':'));
      parts.push(this.applyToken(LoggerTokenType.TIME, minutes));
      parts.push(this.applyToken(LoggerTokenType.PUNCTUATION, ':'));
      parts.push(this.applyToken(LoggerTokenType.TIME, seconds));
      if (withMilliseconds) {
        const milliseconds = this.pad(datetime.getMilliseconds(), 3);
        parts.push(this.applyToken(LoggerTokenType.PUNCTUATION, '.'));
        parts.push(this.applyToken(LoggerTokenType.SECOND, milliseconds));
      }
    }
    return parts.join('');
  }

  private renderLevel(level: LoggerLevelType): string | undefined {
    if (!this.options.level) {
      return undefined;
    }
    return this.applyForeground(level, SYMBOL.separator) + this.applyBackground(level, ` ${level} `);
  }

  private renderMetadata(metadata: LoggerMetadataInterface | undefined): string | undefined {
    if (!this.options.metadata) {
      return undefined;
    }
    const caller = metadata?.caller ? metadata.caller : undefined;
    const method = metadata?.method ? metadata?.method : undefined;
    return [
      this.applyToken(LoggerTokenType.CALLER, caller ?? method ?? '<unknown>'),
      this.applyToken(LoggerTokenType.PUNCTUATION, '.'),
      this.applyToken(LoggerTokenType.METHOD, method ?? '<unknown>'),
      //
    ].join('');
  }

  private renderEnv(level: LoggerLevelType): string | undefined {
    if (!this.options.env) {
      return undefined;
    }
    return (
      this.applyBackground(level, '[') +
      this.applyForeground(level, this.options.env) +
      this.applyBackground(level, ']')
    );
  }

  private renderPid(): string | undefined {
    if (!this.options.pid) {
      return undefined;
    }
    return this.applyToken(LoggerTokenType.LINE, this.pid);
  }

  private renderDebug(level: LoggerLevelType, trace: LoggerTraceFrameInterface[], enabled = true): string | undefined {
    if (!enabled) {
      return undefined;
    }
    return ` ${this.formatTraceBlock(level, trace)}`;
  }

  private renderPerformance(level: LoggerLevelType): string | undefined {
    if (!this.options.performance) {
      return undefined;
    }
    const elapsed = Math.floor(performance.now() - this.startedAt);
    return (
      this.applyForeground(level, '+') +
      this.applyToken(LoggerTokenType.TIME, elapsed.toString()) +
      this.applyForeground(level, 'ms')
    );
  }

  private renderLink(level: LoggerLevelType, file: string | undefined): string | undefined {
    if (!this.options.link || !file) {
      return undefined;
    }
    return this.applyForeground(level, 'at ') + this.render(LoggerTokenType.URL, file);
  }

  /**
   *
   */

  private pad(value: number, length = 2): string {
    return value.toString().padStart(length, '0');
  }

  private getVisibleTraceItems(trace: LoggerTraceFrameInterface[]): LoggerTraceFrameInterface[] {
    return trace.filter((item) => this.isVisibleTraceItem(item));
  }

  private isVisibleTraceItem(item: LoggerTraceFrameInterface): boolean {
    const { file = '', caller = '', method = '' } = item;
    return !(
      isNodeModuleTraceFile(file) ||
      isNodeInternalTraceFile(file) ||
      isRuntimeTraceCaller(caller) ||
      isAnonymousTraceFrame(caller, method) ||
      isNativeTraceFile(file)
    );
  }

  private cloneTraceFrame(frame: LoggerTraceFrameInterface): LoggerTraceFrameInterface {
    return {
      file: frame.file,
      caller: frame.caller,
      method: frame.method,
      line: frame.line,
      column: frame.column,
    };
  }

  private formatTraceFrameLocation(frame: LoggerTraceFrameInterface): string {
    const parts = [frame.file];
    if (frame.line !== undefined) {
      parts.push(String(frame.line));
      if (frame.column !== undefined) {
        parts.push(String(frame.column));
      }
    }
    return parts.join(':');
  }

  private normalizeForInspect(data: unknown, seen = new WeakSet()): unknown {
    return this.normalizeCircular(
      data,
      (error) => {
        return this.serializeError(error, seen);
      },
      seen,
      0,
    );
  }

  private formatTopLevelError(
    error: Error,
    renderTrace: (trace: LoggerTraceFrameInterface[]) => string,
    prettify: (value: unknown) => string,
  ): string {
    const payload = this.serializeError(error);
    const header =
      this.applyColor(payload.name, [this.ef.bold, this.fg.red]) +
      this.applyColor(': ', [this.ef.dim, this.fg.red]) +
      payload.message;
    const trace = Array.isArray(payload.stack)
      ? ` ${renderTrace(payload.stack)}`
      : typeof payload.stack === 'string'
        ? `\n${payload.stack}`
        : '';
    if (!('details' in payload)) {
      return header + trace;
    }
    return header + ' ' + prettify(payload.details) + trace;
  }

  private formatMessageValue(
    message: unknown,
    renderTrace: (trace: LoggerTraceFrameInterface[]) => string,
    prettify: (value: unknown) => string,
    formatString?: (value: string) => string,
  ): string {
    if (message instanceof Error) {
      return this.formatTopLevelError(message, renderTrace, prettify);
    }
    if (typeof message === 'string') {
      return formatString ? formatString(message) : prettify(message);
    }
    return prettify(message);
  }

  private utilInspect(data: unknown): string {
    return util.inspect(this.normalizeForInspect(data), {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  private normalizeCircular(
    data: unknown,
    transformError: (error: Error) => unknown,
    seen = new WeakSet(),
    depth = 0,
  ): unknown {
    const maxDepth = this.options.maxDepth ?? 5;
    const maxArrayLength = this.options.maxArrayLength ?? 5;
    // depth guard
    if (depth > maxDepth) {
      return '[Max depth reached]';
    }
    // Error
    if (data instanceof Error) {
      return transformError(data);
    }
    // primitives
    if (!isObjectLike(data)) {
      return data;
    }
    // Buffer
    if (isBufferLike(data)) {
      return `[Buffer ${data.length} bytes]`;
    }
    // TypedArray
    if (isTypedArrayLike(data)) {
      return `[TypedArray ${data.byteLength} bytes]`;
    }
    // Date / RegExp / URL
    if (isDateLike(data)) {
      return data.toISOString();
    }
    if (isRegExpLike(data)) {
      return data.toString();
    }
    if (isUrlLike(data)) {
      return data.toString();
    }
    // Stream (duck typing)
    if (isPipeLike(data)) {
      return '[Stream]';
    }
    // circular
    if (seen.has(data)) {
      return '[circular]';
    }
    seen.add(data);
    // Array with truncation
    if (Array.isArray(data)) {
      const sliced = data.slice(0, maxArrayLength);
      const normalized = sliced.map((item) => this.normalizeCircular(item, transformError, seen, depth + 1));
      if (data.length > maxArrayLength) {
        normalized.push(`[+${data.length - maxArrayLength} more items]`);
      }
      return normalized;
    }
    // Map
    if (data instanceof Map) {
      const out: Record<string, unknown> = {};
      let index = 0;
      for (const [k, v] of data.entries()) {
        if (index >= maxArrayLength) {
          out['__truncated__'] = `[+${data.size - maxArrayLength} more entries]`;
          break;
        }
        const key = typeof k === 'string' ? k : String(k);
        out[key] = this.normalizeCircular(v, transformError, seen, depth + 1);
        index++;
      }
      return out;
    }
    // Set
    if (data instanceof Set) {
      const values = Array.from(data.values()).slice(0, maxArrayLength);
      const normalized = values.map((v) => this.normalizeCircular(v, transformError, seen, depth + 1));
      if (data.size > maxArrayLength) {
        normalized.push(`[+${data.size - maxArrayLength} more items]`);
      }
      return normalized;
    }
    // only plain objects
    if (!isPlainObject(data)) {
      return data;
    }
    const normalized: Record<string, unknown> = {};
    let index = 0;
    for (const [key, value] of Object.entries(data)) {
      if (index >= maxArrayLength) {
        normalized['__truncated__'] = `[+more keys truncated]`;
        break;
      }
      normalized[key] = this.normalizeCircular(value, transformError, seen, depth + 1);
      index++;
    }
    return normalized;
  }

  private serializeError(
    error: Error,
    seen = new WeakSet(),
  ): {
    name: string;
    message: string;
    stack?: LoggerTraceFrameInterface[] | string;
    details?: Record<string, unknown>;
  } {
    const result: {
      name: string;
      message: string;
      stack?: LoggerTraceFrameInterface[] | string;
      details?: Record<string, unknown>;
    } = {
      name: error.name,
      message: error.message,
    };
    if (this.options.errorStack && error.stack) {
      const stack = this.getVisibleTraceItems(this.stackToTrace(error.stack));
      result.stack = stack.length > 0 ? stack : error.stack;
    }
    const details = this.normalizeErrorDetails(error, seen);
    if (details) {
      result.details = details;
    }
    return result;
  }

  private normalizeErrorDetails(error: Error, seen = new WeakSet()): Record<string, unknown> | undefined {
    const details: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(error)) {
      if (key === 'name' || key === 'message' || key === 'stack') {
        continue;
      }
      details[key] = this.normalizeCircular(
        value,
        (item) => {
          return this.serializeError(item, seen);
        },
        seen,
        0,
      );
    }
    return Object.keys(details).length ? details : undefined;
  }

  /**
   * COLOR HELPERS
   */

  private applyColor(data: string, colorList: AnsiCode[]): string {
    if (!this.colorEnabled || !colorList.length) {
      return data;
    }
    return colorList.join('') + data + this.ef.reset;
  }

  private applyForeground(level: LoggerLevelType, data: string): string {
    if (!this.colorEnabled) {
      return data;
    }
    return AnsiHelper.apply(data, [this.fg[LEVEL_COLOR_MAP[level]] ?? this.ef.underline]);
  }

  private applyBackground(level: LoggerLevelType, data: string): string {
    if (!this.colorEnabled) {
      return data;
    }
    return AnsiHelper.apply(data, [this.bg[LEVEL_COLOR_MAP[level]] ?? this.ef.underline]);
  }

  private applyToken(token: LoggerTokenType, data: string): string {
    if (!this.colorEnabled) {
      return data;
    }
    return AnsiHelper.apply(data, TOKEN_COLOR_MAP[token] ?? [this.ef.underline]);
  }
}
