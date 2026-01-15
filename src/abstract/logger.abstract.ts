import * as util from 'node:util';

const COLOR_MAP = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  yellow: '\u001b[33m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  reset: '\u001b[0m',
};
const { red, green, blue, yellow, magenta, cyan, white, reset } = COLOR_MAP;

export enum LOGGER_LEVEL_ENUM {
  LOG = 'LOG',
  INF = 'INF',
  WRN = 'WRN',
  ERR = 'ERR',
  DBG = 'DBG',
}

export class LoggerAbstract {
  protected color: typeof COLOR_MAP = COLOR_MAP;
  protected level: typeof LOGGER_LEVEL_ENUM = LOGGER_LEVEL_ENUM;

  protected getDate(): string {
    const date = new Date();
    return [
      magenta,
      `${date.getFullYear()}`.padStart(2, '0'),
      '-',
      `${date.getMonth() + 1}`.padStart(2, '0'),
      '-',
      `${date.getDate()}`.padStart(2, '0'),
      reset,
    ].join('');
  }

  protected getTime(): string {
    const date = new Date();
    return [
      cyan,
      `${date.getHours()}`.padStart(2, '0'),
      ':',
      `${date.getMinutes()}`.padStart(2, '0'),
      ':',
      `${date.getSeconds()}`.padStart(2, '0'),
      reset,
    ].join('');
  }

  protected getCaller(caller: string): string {
    return [yellow, caller, reset].join('');
  }

  protected getMethod(method: string): string {
    return [blue, method, reset].join('');
  }

  protected getLink(file: string): string {
    return [
      cyan,
      'at ',
      reset,
      file.replace(`${process.cwd()}/`, ''),
      reset,
      //
    ].join('');
  }

  protected getColor(level: LOGGER_LEVEL_ENUM): string {
    switch (level) {
      case LOGGER_LEVEL_ENUM.LOG:
        return green;
      case LOGGER_LEVEL_ENUM.INF:
        return blue;
      case LOGGER_LEVEL_ENUM.WRN:
        return yellow;
      case LOGGER_LEVEL_ENUM.ERR:
        return red;
      case LOGGER_LEVEL_ENUM.DBG:
        return magenta;
      default:
        return white;
    }
  }

  protected parseStack(): { caller: string; method: string | undefined; file: string } {
    const stack = new Error().stack?.split('\n');
    if (!stack) return { caller: this.getContext(), file: 'unknown', method: undefined };
    const frame = stack.find(
      (line) =>
        line.includes('.ts') &&
        !line.includes('node_modules') &&
        !line.includes('node:internal') &&
        !line.includes('logger') &&
        !line.includes('nestjs'),
    );
    if (!frame) return { caller: this.getContext(), file: 'unknown', method: undefined };
    const cleaned = frame.trim().replace('at ', '');
    const callerMatch = cleaned.match(/([^/\\]+\.ts:\d+:\d+)/);
    const caller = callerMatch ? callerMatch[1] : cleaned;
    const methodMatch = cleaned.match(/^([^\s(]+)/);
    const method = methodMatch && methodMatch[1] && !methodMatch[1].includes('.ts') ? methodMatch[1].trim() : undefined;
    const fileMatch = cleaned.match(/\((.*\.ts:\d+:\d+)\)/) || cleaned.match(/(.*\.ts:\d+:\d+)/);
    const file = fileMatch ? fileMatch[1] : cleaned;
    return {
      caller: this.getContext(caller),
      method: method,
      file: file,
    };
  }

  protected getMethodName(method: string | undefined): string | undefined {
    const result = method?.split('.').pop();
    return result === '<anonymous>' ? undefined : result;
  }

  protected prettify(data: unknown): string {
    if (typeof data === 'string') {
      return `${white}${data}${reset}`;
    }
    return util.inspect(data, {
      colors: true,
      showHidden: false,
      sorted: false,
      depth: null,
    });
  }

  protected writeHeader(level: LOGGER_LEVEL_ENUM, caller: string, method?: string): void {
    process.stdout.write(`${this.color.reset}[${this.getColor(level)}${level}${this.color.reset}] `);
    process.stdout.write(`${this.getDate()} `);
    process.stdout.write(`${this.getTime()} `);
    process.stdout.write(`${this.getCaller(caller)}`);
    if (method) {
      process.stdout.write(` ${this.getMethod(method)}`);
    }
    process.stdout.write(' ');
  }

  protected colorizeString(message: string, baseColor: string): string {
    const withBraces = message.replace(/\{[^}]+}/g, (match) => {
      const inner = match.slice(1, -1);
      return `${this.color.yellow}{${this.color.white}${inner}${this.color.yellow}}${baseColor}`;
    });
    return `${baseColor}${withBraces}${this.color.reset}`;
  }

  private getContext(caller?: string): string {
    if (!caller) return 'App';
    const file = caller.split(':')[0];
    const clean = file.replace('.ts', '');
    return clean
      .split(/[.-]/g)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join('');
  }
}
