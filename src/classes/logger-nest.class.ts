import { LoggerClass, LoggerLevelType, LoggerMetadataInterface, LoggerOptionsInterface } from './logger.class';

const NEST_CALLER_LIST = [
  'NestFactory',
  'InstanceLoader',
  'WebSocketsController',
  'RouterExplorer',
  'RoutesResolver',
  'GraphQLModule',
  'NestApplication',
];
const HTTP_METHOD_SET = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
type TokenType =
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
  | 'pathSegment';

export class LoggerNestClass extends LoggerClass {
  public constructor(options: LoggerOptionsInterface) {
    super(options);
  }

  public resolveMetadata(stack = '', level: number): LoggerMetadataInterface {
    return this.resolveMetadataFromTrace(this.stackToTrace(stack), level);
  }

  public resolveCaller(metadata: LoggerMetadataInterface): string {
    return this.resolveCallerValue(metadata);
  }

  public print(
    level: LoggerLevelType,
    metadata: LoggerMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
  ): void {
    const caller = callerOverride ?? metadata.caller;
    const data = Array.isArray(message) ? message : [message];
    this.stdout(this.format(level, { ...metadata, caller }, data));
  }

  private format(level: LoggerLevelType, metadata: LoggerMetadataInterface, data: unknown[]): string {
    const parts: string[] = [];
    this.pushPart(parts, this.formatStandardHeader(level, this.resolveCaller(metadata), metadata.method));
    this.pushPart(parts, this.formatMessageSeparator(level));
    this.pushPart(
      parts,
      this.formatMessageList(
        data,
        (trace) => this.formatTraceBlock('ERR', trace),
        (value) => {
          if (typeof value === 'string') {
            return this.colorizeString(value, 'text');
          }
          return this.prettifyValue(value);
        },
        (value) => {
          const useLevelColor = NEST_CALLER_LIST.includes(metadata.caller);
          return this.colorizeString(value, useLevelColor ? 'systemText' : 'text');
        },
      ),
    );
    this.pushPart(
      parts,
      this.formatTraceSuffix(level, this.stackToTrace(new Error().stack), this.shouldRenderDebugTrace(level)),
    );
    this.pushPart(parts, this.formatPerformanceSuffix());
    this.pushPart(parts, this.formatLinkSuffix(level, metadata.file));
    return `${parts.join('')}\n`;
  }

  private colorizeString(message: string, baseType: TokenType): string {
    if (!this.options.color) {
      return message;
    }
    const applyToken = (type: TokenType, value: string): string => {
      return `${this.effect.reset}${this.wrap(value, this.getTokenColorList(type))}`;
    };
    let out = '';
    let mode: 'normal' | 'single' | 'double' = 'normal';
    let path = '';
    let word = '';
    const flushPath = (): void => {
      if (!path) return;
      out += `${this.effect.reset}${this.colorizePath(path)}`;
      path = '';
    };
    const flushWord = (): void => {
      if (!word) return;
      if (HTTP_METHOD_SET.has(word)) {
        out += applyToken('httpMethod', word);
      } else {
        out += applyToken(baseType, word);
      }
      word = '';
    };
    for (let i = 0; i < message.length; i++) {
      const ch = message[i];
      // ───────── кавычки ─────────
      if (ch === "'" && mode !== 'double') {
        flushPath();
        flushWord();
        mode = mode === 'single' ? 'normal' : 'single';
        out += applyToken('quote', ch);
        continue;
      }
      if (ch === '"' && mode !== 'single') {
        flushPath();
        flushWord();
        mode = mode === 'double' ? 'normal' : 'double';
        out += applyToken('quote', ch);
        continue;
      }
      // ───────── скобки ─────────
      if (mode === 'normal') {
        if (ch === '{' || ch === '}') {
          flushPath();
          flushWord();
          out += applyToken(ch === '{' ? 'braceOpen' : 'braceClose', ch);
          continue;
        }
        if (ch === '[' || ch === ']') {
          flushPath();
          flushWord();
          out += applyToken('bracket', ch);
          continue;
        }
        if (ch === '(' || ch === ')') {
          flushPath();
          flushWord();
          out += applyToken('parenthesis', ch);
          continue;
        }
        if (ch === ',') {
          flushPath();
          flushWord();
          out += applyToken('comma', ch);
          continue;
        }
      }
      // ───────── путь ─────────
      if (mode === 'normal' && ch === '/') {
        flushWord();
        flushPath();
        path = '/';
        continue;
      }
      if (path) {
        if (
          ch === ' ' ||
          ch === '"' ||
          ch === "'" ||
          ch === '{' ||
          ch === '}' ||
          ch === '[' ||
          ch === ']' ||
          ch === '(' ||
          ch === ')'
        ) {
          flushPath();
          flushWord();
          out += applyToken(baseType, ch);
        } else {
          path += ch;
        }
        continue;
      }
      if (mode === 'normal' && /[A-Z]/.test(ch)) {
        word += ch;
        continue;
      }
      flushWord();
      out += applyToken(baseType, ch);
    }
    flushPath();
    flushWord();
    return out + this.effect.reset;
  }

  private getTokenColorList(type: TokenType): string[] {
    switch (type) {
      case 'text':
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
        return [this.effect.dim, this.foreground.blue];
      case 'pathSegment':
        return [this.foreground.blue];
      default:
        return [this.foreground.white];
    }
  }

  private colorizePath(path: string): string {
    const isAbsolute = path.startsWith('/');
    const parts = path.split('/').filter(Boolean);
    let out = '';
    if (isAbsolute) {
      out += this.wrap('/', this.getTokenColorList('pathSeparator'));
    }
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        out += this.wrap('/', this.getTokenColorList('pathSeparator'));
      }
      out += this.wrap(parts[i], this.getTokenColorList('pathSegment'));
    }
    return out;
  }
}
