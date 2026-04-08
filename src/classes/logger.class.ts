import * as util from 'node:util';

export interface LoggerOptionsInterface {
  color?: boolean;
  info?: boolean;
  name?: string;
  pid?: boolean;
  date?: boolean;
  time?: boolean;
  metadata?: boolean;
  performance?: boolean;
  link?: boolean;
  traceIndex?: number;
  stackError?: boolean;
  stackDebug?: boolean;
  sort?: boolean;
  hidden?: boolean;
}

export interface LoggerMetadataInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

export type LoggerLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export type LoggerTokenType =
  | 'text'
  | 'systemText'
  | 'quote'
  | 'braceOpen'
  | 'braceClose'
  | 'bracket'
  | 'parenthesis'
  | 'comma'
  | 'httpMethod'
  | 'pathSeparator'
  | 'pathSegment'
  | 'number'
  | 'interpolationOpen'
  | 'interpolationClose'
  | 'stringContent';

interface ForegroundInterface {
  red: string;
  green: string;
  blue: string;
  yellow: string;
  magenta: string;
  cyan: string;
  white: string;
}

interface BackgroundInterface {
  red: string;
  green: string;
  blue: string;
  yellow: string;
  magenta: string;
  cyan: string;
  white: string;
}

interface EffectInterface {
  bold: string;
  dim: string;
  reset: string;
  underline: string;
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
const EFFECT_ON: EffectInterface = {
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  reset: '\u001b[0m',
  underline: '\u001b[4m',
};
const FOREGROUND_ON: ForegroundInterface = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  yellow: '\u001b[33m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};
const BACKGROUND_ON: BackgroundInterface = {
  red: '\u001b[41m',
  green: '\u001b[42m',
  blue: '\u001b[44m',
  yellow: '\u001b[43m',
  magenta: '\u001b[45m',
  cyan: '\u001b[46m',
  white: '\u001b[47m',
};
const EFFECT_OFF: EffectInterface = {
  bold: '',
  dim: '',
  reset: '',
  underline: '',
};
const FOREGROUND_OFF: ForegroundInterface = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  cyan: '',
  white: '',
};
const BACKGROUND_OFF: BackgroundInterface = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  cyan: '',
  white: '',
};
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
const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

export class LoggerClass {
  public readonly effect: EffectInterface;
  public readonly foreground: ForegroundInterface;
  public readonly background: BackgroundInterface;
  public readonly arrow: ArrowInterface;
  public readonly status: StatusInterface;
  protected readonly pid = process.pid.toString();
  protected readonly startedAt = performance.now();
  protected readonly options: LoggerOptionsInterface;
  protected readonly colorEnabled: boolean;

  public constructor(color: boolean | LoggerOptionsInterface) {
    const colorEnabled = typeof color === 'boolean' ? color : Boolean(color.color);
    this.options = typeof color === 'boolean' ? { color } : color;
    this.colorEnabled = colorEnabled;
    if (colorEnabled) {
      this.effect = EFFECT_ON;
      this.foreground = FOREGROUND_ON;
      this.background = BACKGROUND_ON;
    } else {
      this.effect = EFFECT_OFF;
      this.foreground = FOREGROUND_OFF;
      this.background = BACKGROUND_OFF;
    }
    this.arrow = ARROW;
    this.status = STATUS;
  }

  public wrap(data: string, colorList: string[]): string {
    if (!this.colorEnabled) {
      return data;
    }
    return `${colorList.join('')}${data}${this.effect.reset}`;
  }

  public formatText(value: string): string {
    return this.colorizeString(value, 'text');
  }

  public resolveMethod(method: string | undefined): string | undefined {
    const result = method?.split('.').pop();
    return result === '<anonymous>' ? undefined : result;
  }

  protected formatDate(): string {
    const date = new Date();
    return [
      this.wrap(`${date.getFullYear()}`.padStart(2, '0'), [this.foreground.magenta]),
      this.wrap('-', [this.foreground.cyan]),
      this.wrap(`${date.getMonth() + 1}`.padStart(2, '0'), [this.foreground.magenta]),
      this.wrap('-', [this.foreground.cyan]),
      this.wrap(`${date.getDate()}`.padStart(2, '0'), [this.foreground.magenta]),
    ].join('');
  }

  protected formatTime(withMilliseconds = false): string {
    const date = new Date();
    const parts = [
      this.wrap(`${date.getHours()}`.padStart(2, '0'), [this.foreground.cyan]),
      this.wrap(':', [this.foreground.magenta]),
      this.wrap(`${date.getMinutes()}`.padStart(2, '0'), [this.foreground.cyan]),
      this.wrap(':', [this.foreground.magenta]),
      this.wrap(`${date.getSeconds()}`.padStart(2, '0'), [this.foreground.cyan]),
    ];
    if (withMilliseconds) {
      parts.push(this.wrap('.', [this.foreground.magenta]));
      parts.push(this.wrap(`${date.getMilliseconds()}`.padStart(3, '0'), [this.effect.dim, this.foreground.cyan]));
    }
    return parts.join('');
  }

  protected formatInspectable(data: unknown, normalize: (value: unknown) => unknown): string {
    if (typeof data === 'string') {
      return this.wrap(data, [this.foreground.white]);
    }
    return util.inspect(normalize(data), {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  protected normalizeCircular(data: unknown, transformError: (error: Error) => unknown, seen = new WeakSet()): unknown {
    if (data instanceof Error) {
      return transformError(data);
    }
    if (!data || typeof data !== 'object') {
      return data;
    }
    if (seen.has(data)) {
      return '[circular]';
    }
    seen.add(data);
    if (Array.isArray(data)) {
      return data.map((item) => this.normalizeCircular(item, transformError, seen));
    }
    const proto = Object.getPrototypeOf(data) as object | null;
    if (proto !== Object.prototype && proto !== null) {
      return data;
    }
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      normalized[key] = this.normalizeCircular(value, transformError, seen);
    }
    return normalized;
  }

  protected stdout(data: string): void {
    try {
      process.stdout.write(data);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      const message = '---------------[LOGGER STDOUT ERROR]---------------';
      process.stderr.write('\n');
      process.stderr.write(this.wrap(message, [this.effect.bold, this.foreground.red]) + '\n');
      process.stderr.write(
        this.wrap('Source: ', [this.effect.dim]) + this.wrap(this.constructor.name, [this.foreground.yellow]) + '\n',
      );
      process.stderr.write(
        this.wrap('Error : ', [this.effect.dim]) +
          this.wrap(`${error.name}: ${error.message}`, [this.foreground.red]) +
          '\n',
      );
      if (error.stack) {
        const trace = this.stackToTrace(error.stack);
        if (trace.length) {
          process.stderr.write(this.wrap('Stack trace:\n', [this.effect.bold, this.foreground.magenta]));
          for (const item of trace) {
            process.stderr.write(
              '  ' +
                this.wrap('at ', [this.effect.dim]) +
                this.wrap(item.caller, [this.foreground.yellow]) +
                (item.method ? this.wrap(`.${item.method}`, [this.foreground.blue]) : '') +
                ' ' +
                this.wrap(item.file, [this.foreground.cyan]) +
                '\n',
            );
          }
        }
      }
      process.stderr.write(this.wrap('Original log payload:\n', [this.effect.bold, this.foreground.magenta]));
      process.stderr.write(data.endsWith('\n') ? data : data + '\n');
      process.stderr.write(this.wrap('-'.repeat(message.length), [this.foreground.red]));
    }
  }

  protected stackToTrace(stack = '', filterNode = false): LoggerMetadataInterface[] {
    if (!stack) {
      return [];
    }
    const root = process.cwd();
    const result: LoggerMetadataInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      let file = match[2];
      if (
        filterNode &&
        (file.includes('node_modules') || file.startsWith('node:internal') || (caller === '' && method === ''))
      ) {
        continue;
      }
      if (root && file.startsWith(root)) {
        file = file.slice(root.length).replace(/^\/|\/$/g, '') || '.';
      } else {
        file = file.replace(/^\/|\/$/g, '');
      }
      result.push({ caller, method, file });
    }
    return result;
  }

  protected jsonParse<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data;
    }
  }

  protected parseErrorMessage(message: string): unknown {
    return this.jsonParse<unknown>(message);
  }

  protected getTraceIndex(fallback = 1): number {
    return this.options.traceIndex ?? fallback;
  }

  protected getElapsedMs(): number {
    return Math.floor(performance.now() - this.startedAt);
  }

  protected resolveMetadataFromTrace(trace: LoggerMetadataInterface[], level: number): LoggerMetadataInterface {
    const traceLevel = this.getTraceIndex(level);
    const metadata = trace[traceLevel];
    if (metadata) {
      return {
        file: metadata.file,
        caller: metadata.caller,
        method: metadata.method,
      };
    }
    const nextMetadata = trace.slice(traceLevel).find((item) => {
      return item.caller && item.method;
    });
    return {
      file: nextMetadata?.file ?? '',
      caller: nextMetadata?.caller ?? 'unknown',
      method: nextMetadata?.method,
    };
  }

  protected normalizeErrorForInspect(error: Error, seen = new WeakSet()): Record<string, unknown> {
    const source = error as Error & {
      code?: unknown;
      cause?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    const normalized: Record<string, unknown> = {
      name: error.name,
      message: this.parseErrorMessage(error.message),
    };
    if (source.code !== undefined) {
      normalized.code = source.code;
    }
    if (source.status !== undefined) {
      normalized.status = source.status;
    }
    if (source.statusCode !== undefined) {
      normalized.statusCode = source.statusCode;
    }
    if (source.cause !== undefined) {
      normalized.cause = this.normalizeCircular(
        source.cause,
        (item) => this.normalizeErrorForInspect(item, seen),
        seen,
      );
    }
    if (this.options.stackError && error.stack) {
      normalized.stack = this.stackToTrace(error.stack);
    }
    return normalized;
  }

  protected normalizeForInspect(data: unknown, seen = new WeakSet()): unknown {
    return this.normalizeCircular(data, (error) => this.normalizeErrorForInspect(error, seen), seen);
  }

  protected prettifyValue(data: unknown): string {
    return this.formatInspectable(data, (value) => this.normalizeForInspect(value));
  }

  protected colorizeString(
    message: string,
    baseType: LoggerTokenType,
    isHttpMethod: (value: string) => boolean = () => false,
  ): string {
    if (!this.options.color) {
      return message;
    }
    const applyToken = (type: LoggerTokenType, value: string): string => {
      return `${this.effect.reset}${this.wrap(value, this.getTokenColorList(type))}`;
    };
    const applySymbol = (value: string, fallbackType: LoggerTokenType = baseType): string => {
      switch (value) {
        case "'":
        case '"':
          return applyToken('quote', value);
        case '{':
          return applyToken('braceOpen', value);
        case '}':
          return applyToken('braceClose', value);
        case '[':
        case ']':
          return applyToken('bracket', value);
        case '(':
        case ')':
          return applyToken('parenthesis', value);
        case ',':
          return applyToken('comma', value);
        default:
          return applyToken(fallbackType, value);
      }
    };
    let out = '';
    let mode: 'normal' | 'single' | 'double' = 'normal';
    let path = '';
    let word = '';
    let interpolationDepth = 0;
    const flushPath = (): void => {
      if (!path) {
        return;
      }
      out += `${this.effect.reset}${this.colorizePath(path)}`;
      path = '';
    };
    const flushWord = (): void => {
      if (!word) {
        return;
      }
      if (isHttpMethod(word)) {
        out += applyToken('httpMethod', word);
      } else {
        out += applyToken(baseType, word);
      }
      word = '';
    };
    for (let index = 0; index < message.length; index++) {
      const char = message[index];
      const isString = mode === 'single' || mode === 'double';

      if (isString && char === '$' && message[index + 1] === '{') {
        out += applyToken('interpolationOpen', '${');
        index++;
        interpolationDepth++;
        continue;
      }

      if (interpolationDepth > 0) {
        if (char === '{') {
          interpolationDepth++;
          out += applyToken('braceOpen', char);
          continue;
        }
        if (char === '}') {
          interpolationDepth--;
          out += applyToken(interpolationDepth === 0 ? 'interpolationClose' : 'braceClose', char);
          continue;
        }
        out += applySymbol(char);
        continue;
      }

      if (char === "'" && mode !== 'double') {
        flushPath();
        flushWord();
        mode = mode === 'single' ? 'normal' : 'single';
        out += applyToken('quote', char);
        continue;
      }
      if (char === '"' && mode !== 'single') {
        flushPath();
        flushWord();
        mode = mode === 'double' ? 'normal' : 'double';
        out += applyToken('quote', char);
        continue;
      }
      if (isString && char !== '"' && char !== "'") {
        out += applySymbol(char, 'stringContent');
        continue;
      }
      if (mode === 'normal' && /[0-9]/.test(char)) {
        let number = char;
        while (index + 1 < message.length && /[0-9.]/.test(message[index + 1])) {
          number += message[++index];
        }
        out += applyToken('number', number);
        continue;
      }
      if (mode === 'normal') {
        if (char === '{' || char === '}') {
          flushPath();
          flushWord();
          out += applyToken(char === '{' ? 'braceOpen' : 'braceClose', char);
          continue;
        }
        if (char === '[' || char === ']') {
          flushPath();
          flushWord();
          out += applyToken('bracket', char);
          continue;
        }
        if (char === '(' || char === ')') {
          flushPath();
          flushWord();
          out += applyToken('parenthesis', char);
          continue;
        }
        if (char === ',') {
          flushPath();
          flushWord();
          out += applyToken('comma', char);
          continue;
        }
      }
      if (mode === 'normal' && char === '/') {
        flushWord();
        flushPath();
        path = '/';
        continue;
      }
      if (path) {
        if (
          char === ' ' ||
          char === '"' ||
          char === "'" ||
          char === '{' ||
          char === '}' ||
          char === '[' ||
          char === ']' ||
          char === '(' ||
          char === ')'
        ) {
          flushPath();
          flushWord();
          out += applySymbol(char);
        } else {
          path += char;
        }
        continue;
      }
      if (mode === 'normal' && /[A-Z]/.test(char)) {
        word += char;
        continue;
      }
      flushWord();
      out += applySymbol(char);
    }
    flushPath();
    flushWord();
    return out + this.effect.reset;
  }

  protected getTokenColorList(type: LoggerTokenType): string[] {
    switch (type) {
      case 'text':
        return [this.foreground.green];
      case 'stringContent':
        return [this.foreground.green];
      case 'systemText':
        return [this.effect.dim, this.foreground.yellow];
      case 'quote':
        return [this.effect.bold, this.foreground.yellow];
      case 'braceOpen':
        return [this.effect.bold, this.foreground.magenta];
      case 'braceClose':
        return [this.effect.bold, this.foreground.magenta];
      case 'bracket':
        return [this.effect.bold, this.foreground.cyan];
      case 'parenthesis':
        return [this.effect.bold, this.foreground.blue];
      case 'comma':
        return [this.foreground.magenta];
      case 'httpMethod':
        return [this.foreground.cyan];
      case 'pathSeparator':
        return [this.effect.dim, this.foreground.cyan];
      case 'pathSegment':
        return [this.foreground.blue];
      case 'number':
        return [this.foreground.magenta];
      case 'interpolationOpen':
      case 'interpolationClose':
        return [this.effect.bold, this.foreground.magenta];
      default:
        return [this.foreground.white];
    }
  }

  protected colorizePath(path: string): string {
    const isAbsolute = path.startsWith('/');
    const parts = path.split('/').filter(Boolean);
    let out = '';
    if (isAbsolute) {
      out += this.wrap('/', this.getTokenColorList('pathSeparator'));
    }
    for (let index = 0; index < parts.length; index++) {
      if (index > 0) {
        out += this.wrap('/', this.getTokenColorList('pathSeparator'));
      }
      out += this.wrap(parts[index], this.getTokenColorList('pathSegment'));
    }
    return out;
  }

  protected formatTopLevelError(
    error: Error,
    renderTrace: (trace: LoggerMetadataInterface[]) => string,
    prettify: (value: unknown) => string,
  ): string {
    const source = error as Error & {
      code?: unknown;
      cause?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    const parsedMessage = this.parseErrorMessage(error.message);
    const details: Record<string, unknown> = {};
    const hasExtraFields =
      source.code !== undefined ||
      source.status !== undefined ||
      source.statusCode !== undefined ||
      source.cause !== undefined;

    if (parsedMessage !== error.message || hasExtraFields) {
      details.message = parsedMessage;
    }
    if (source.code !== undefined) {
      details.code = source.code;
    }
    if (source.status !== undefined) {
      details.status = source.status;
    }
    if (source.statusCode !== undefined) {
      details.statusCode = source.statusCode;
    }
    if (source.cause !== undefined) {
      details.cause = this.normalizeForInspect(source.cause);
    }

    const header = this.formatErrorHeader(error.name, Object.keys(details).length ? '' : error.message);
    const trace = this.options.stackError && error.stack ? ` ${renderTrace(this.stackToTrace(error.stack))}` : '';

    if (!Object.keys(details).length) {
      return `${header}${trace}`;
    }

    const payload = Object.keys(details).length === 1 && 'message' in details ? details.message : details;

    return `${header}${prettify(payload)}${trace}`;
  }

  protected formatMessageValue(
    message: unknown,
    renderTrace: (trace: LoggerMetadataInterface[]) => string,
    prettify: (value: unknown) => string,
    formatString?: (value: string) => string,
  ): string {
    if (message instanceof Error) {
      return this.formatTopLevelError(message, renderTrace, prettify);
    }
    if (this.isErrorLike(message)) {
      return this.formatErrorLikeValue(message, renderTrace, prettify);
    }
    if (typeof message === 'string') {
      if (this.isStackTraceString(message)) {
        return this.formatStackTraceString(message, renderTrace, (value) => {
          return formatString ? formatString(value) : prettify(value);
        });
      }
      return formatString ? formatString(message) : prettify(message);
    }
    return prettify(message);
  }

  protected formatMessageList(
    messages: unknown[],
    renderTrace: (trace: LoggerMetadataInterface[]) => string,
    prettify: (value: unknown) => string,
    formatString?: (value: string) => string,
  ): string {
    return messages.map((message) => this.formatMessageValue(message, renderTrace, prettify, formatString)).join(' ');
  }

  protected getLevelForeground(level: LoggerLevelType): string {
    switch (level) {
      case 'LOG':
        return this.foreground.green;
      case 'INF':
        return this.foreground.blue;
      case 'WRN':
        return this.foreground.yellow;
      case 'ERR':
        return this.foreground.red;
      case 'DBG':
        return this.foreground.magenta;
      case 'FTL':
        return this.foreground.red;
      default:
        return this.foreground.white;
    }
  }

  protected getLevelBackground(level: LoggerLevelType): string {
    switch (level) {
      case 'LOG':
        return this.background.green;
      case 'INF':
        return this.background.blue;
      case 'WRN':
        return this.background.yellow;
      case 'ERR':
        return this.background.red;
      case 'DBG':
        return this.background.magenta;
      case 'FTL':
        return this.background.red;
      default:
        return this.background.white;
    }
  }

  protected getTraceForeground(level: LoggerLevelType): string {
    return this.getLevelForeground(level);
  }

  protected formatErrorHeader(name: string, message: string): string {
    return `${this.wrap(name, [this.effect.bold, this.foreground.red])}${this.wrap(': ', [this.effect.dim, this.foreground.red])}${message}`;
  }

  protected formatPerformanceValue(elapsed: number): string {
    return `${this.wrap('+', [this.effect.dim, this.foreground.cyan])}${this.wrap(elapsed.toString(), [
      this.foreground.cyan,
    ])}${this.wrap('ms', [this.effect.dim, this.foreground.cyan])}`;
  }

  protected formatTraceBlock(level: LoggerLevelType, trace: LoggerMetadataInterface[]): string {
    const lines = trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .map((item) => {
        if (this.options.info) {
          return `${this.wrap(' at ', [this.effect.dim, this.getTraceForeground(level)])}${item.file}`;
        }
        return `    ${item.file}`;
      });
    return `${this.wrap('{', [this.effect.bold, this.foreground.cyan])}\n${lines.join('\n')}\n${this.wrap('}', [this.effect.bold, this.foreground.cyan])}`;
  }

  protected formatHeaderInfo(level: LoggerLevelType, parts: Array<string | undefined>): string | undefined {
    const info = parts.filter((item): item is string => {
      return Boolean(item);
    });
    if (!info.length) {
      return undefined;
    }
    return `${info.join(this.wrap(' \u2503 ', [this.getLevelForeground(level)]))} `;
  }

  protected formatMessageSeparator(level: LoggerLevelType): string {
    return `${this.wrap('\u2503', [this.getLevelForeground(level)])} `;
  }

  protected formatTraceSuffix(
    level: LoggerLevelType,
    trace: LoggerMetadataInterface[],
    enabled = true,
  ): string | undefined {
    if (!enabled) {
      return undefined;
    }
    return ` ${this.formatTraceBlock(level, trace)}`;
  }

  protected shouldRenderDebugTrace(level: LoggerLevelType): boolean {
    return level === 'DBG' && !!this.options.stackDebug;
  }

  protected formatPerformanceSuffix(): string | undefined {
    if (!this.options.performance) {
      return undefined;
    }
    return ` ${this.formatPerformanceValue(this.getElapsedMs())}`;
  }

  protected formatLinkLine(level: LoggerLevelType, file: string): string {
    return `${this.wrap('at ', [this.getLevelForeground(level)])}${file}`;
  }

  protected formatLinkSuffix(level: LoggerLevelType, file: string): string | undefined {
    if (!this.options.link) {
      return undefined;
    }
    return `\n${this.formatLinkLine(level, file)}`;
  }

  protected pushPart(parts: string[], value: string | undefined): void {
    if (value) {
      parts.push(value);
    }
  }

  protected formatName(level: LoggerLevelType): string | undefined {
    if (!this.options.name) {
      return undefined;
    }
    return [
      this.wrap('[', [this.effect.bold, this.getLevelForeground(level)]),
      this.wrap(this.options.name, [this.effect.dim]),
      this.wrap(']', [this.effect.bold, this.getLevelForeground(level)]),
      //
    ].join('');
  }

  protected formatLevelBadge(level: LoggerLevelType): string | undefined {
    if (!this.options.info) {
      return undefined;
    }
    return this.wrap(` ${level} `, [this.getLevelBackground(level)]);
  }

  protected formatPid(): string | undefined {
    if (!this.options.pid) {
      return undefined;
    }
    return this.wrap(this.pid, [this.foreground.cyan]);
  }

  protected formatHeaderDate(): string | undefined {
    if (!this.options.date) {
      return undefined;
    }
    return this.formatDate();
  }

  protected formatHeaderTime(): string | undefined {
    if (!this.options.time) {
      return undefined;
    }
    return this.formatTime(true);
  }

  protected formatStandardHeader(level: LoggerLevelType, caller?: string, method?: string): string {
    return [
      this.formatLevelBadge(level),
      this.formatName(level),
      this.formatHeaderInfo(level, [
        this.formatPid(),
        this.formatHeaderDate(),
        this.formatHeaderTime(),
        this.formatCallerMethod(caller, method),
      ]),
    ]
      .filter((part) => part)
      .join(' ');
  }

  protected formatCallerMethod(caller?: string, method?: string): string | undefined {
    if (this.options.metadata === false) {
      return undefined;
    }
    const callerLabel = caller ? this.wrap(caller, [this.effect.bold]) : undefined;
    const methodName = this.resolveMethod(method);
    const methodLabel = methodName ? this.wrap(methodName, [this.effect.bold, this.foreground.white]) : undefined;
    if (!callerLabel) {
      return methodLabel;
    }
    if (!methodLabel) {
      return callerLabel;
    }
    return `${callerLabel} ${methodLabel}`;
  }

  protected resolveCallerValue(metadata: LoggerMetadataInterface): string {
    if (metadata.caller && metadata.caller !== '<anonymous>') {
      return metadata.caller;
    }
    const file = metadata.file || '';
    const base = file.split('/').pop() || file.split('\\').pop() || 'App';
    const stem = base.replace(/\.[^/.]+$/, '');
    if (!stem) {
      return 'App';
    }
    return stem
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  protected isErrorLike(message: unknown): message is { name?: unknown; message?: unknown; stack?: unknown } {
    if (!message || typeof message !== 'object') {
      return false;
    }
    if (!('message' in message) || typeof message.message !== 'string') {
      return false;
    }
    return (
      ('name' in message && typeof message.name === 'string') ||
      ('stack' in message && typeof message.stack === 'string')
    );
  }

  protected isStackTraceString(message: string): boolean {
    return /\n\s*at\s+/.test(message);
  }

  protected formatErrorLikeValue(
    message: { name?: unknown; message?: unknown; stack?: unknown },
    renderTrace: (trace: LoggerMetadataInterface[]) => string,
    prettify: (value: unknown) => string,
  ): string {
    const name = typeof message.name === 'string' && message.name ? message.name : 'Error';
    const text = typeof message.message === 'string' ? message.message : '';
    const parsedMessage = this.parseErrorMessage(text);
    if (parsedMessage !== text) {
      const header = this.formatErrorHeader(name, '');
      const trace =
        this.options.stackError && typeof message.stack === 'string' && message.stack
          ? ` ${renderTrace(this.stackToTrace(message.stack))}`
          : '';
      return `${header}${prettify(parsedMessage)}${trace}`;
    }
    const header = this.formatErrorHeader(name, text);
    if (this.options.stackError && typeof message.stack === 'string' && message.stack) {
      return `${header} ${renderTrace(this.stackToTrace(message.stack))}`;
    }
    return header;
  }

  protected formatStackTraceString(
    message: string,
    renderTrace: (trace: LoggerMetadataInterface[]) => string,
    fallback: (value: string) => string,
  ): string {
    const trace = this.stackToTrace(message);
    if (!trace.length) {
      return fallback(message);
    }
    const [firstLine] = message.split('\n');
    const headerMatch = firstLine.match(/^([^:]+):\s*(.*)$/);
    if (!headerMatch) {
      return renderTrace(trace);
    }
    const [, name, text] = headerMatch;
    const header = this.formatErrorHeader(name, text);
    return `${header} ${renderTrace(trace)}`;
  }
}
