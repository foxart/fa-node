enum LevenEnum {
  LOG = 'LOG',
  INF = 'INFO',
  WRN = 'WARNING',
  ERR = 'ERROR',
  DBG = 'DEBUG',
  CST = 'CUSTOM',
}

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

const foreground = {
  BLACK: 'color: #000000;',
  RED: 'color: #e74c3c;',
  GREEN: 'color: #27ae60;',
  YELLOW: 'color: #f1c40f;',
  BLUE: 'color: #0000FF;',
  MAGENTA: 'color: #8e44ad;',
  CYAN: 'color: #00bcd4;',
  WHITE: 'color: #ffffff;',
  GRAY: 'color: #7f8c8d;',
};
const background = {
  BLACK: 'background-color: #000000;',
  RED: 'background-color: #e74c3c;',
  GREEN: 'background-color: #27ae60;',
  YELLOW: 'background-color: #f1c40f;',
  BLUE: 'background-color: #0000FF;',
  MAGENTA: 'background-color: #8e44ad;',
  CYAN: 'background-color: #00bcd4;',
  WHITE: 'background-color: #ffffff;',
  GRAY: 'background-color: #7f8c8d;',
};
const padding = 'padding: 2px 8px;';
const fontWeightBold = 'font-weight: bold;';
const borderRadius = 'border-radius: 4px;';
const LEVEL_STYLES: Record<LevenEnum, string> = {
  [LevenEnum.LOG]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.GREEN}`,
  [LevenEnum.INF]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.BLUE}`,
  [LevenEnum.WRN]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.BLACK} ${background.YELLOW}`,
  [LevenEnum.ERR]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.RED}`,
  [LevenEnum.DBG]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.BLACK} ${background.WHITE}`,
  [LevenEnum.CST]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.MAGENTA}`,
};
const RESET_STYLES = `
  padding: 0;
  font-weight: initial;
  border-radius:0;
  color: initial;
  background-color: initial;
`;

function formatDate(now = new Date()): string {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatTime(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export interface ConsoleBrowserOptionsInterface {
  color?: boolean;
  info?: boolean;
  name?: string;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
}

export class LoggerBrowser {
  private readonly performanceStart: number;

  public constructor(private readonly options: ConsoleBrowserOptionsInterface = {}) {
    this.performanceStart = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  public override(): void {
    console.log = console.log.bind(this, ...this.log());
    console.warn = console.warn.bind(this, ...this.warn());
    console.info = console.info.bind(this, ...this.info());
    console.error = console.error.bind(this, ...this.error());
    console.debug = console.debug.bind(this, ...this.debug());
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }

  public log(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.LOG, args);
  }

  public info(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.INF, args);
  }

  public warn(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.WRN, args);
  }

  public error(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.ERR, args);
  }

  public debug(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.DBG, args);
  }

  public custom(...args: unknown[]): unknown[] {
    return this.wrap(LevenEnum.CST, args);
  }

  private wrap(level: LevenEnum, args: unknown[]): unknown[] {
    const styleList: string[] = [];
    const templateList: string[] = [];
    if (this.options.info) {
      templateList.push(`%c${level}`);
      styleList.push(this.options.color ? LEVEL_STYLES[level] : '');
    }
    if (this.options.name) {
      templateList.push(`%c${this.options.name}`);
      styleList.push(`${foreground.WHITE} ${fontWeightBold}`);
    }
    if (this.options.date) {
      templateList.push(`%c${formatDate()}`);
      styleList.push(foreground.GREEN);
    }
    if (this.options.time) {
      templateList.push(`%c${formatTime()}`);
      styleList.push(foreground.GREEN);
    }
    if (this.options.performance && typeof performance !== 'undefined') {
      const performanceMs = Math.floor(performance.now() - this.performanceStart);
      templateList.push(`%c+${performanceMs}ms`);
      styleList.push(`${foreground.CYAN} ${fontWeightBold}`);
    }
    return templateList.length
      ? [
          templateList.flatMap((item, i) => (i < templateList.length - 1 ? [item, '%c '] : [item])).join(''),
          ...styleList.flatMap((item, i) => (i < styleList.length - 1 ? [item, RESET_STYLES] : [item])),
          ...args,
        ]
      : args;
  }
}
