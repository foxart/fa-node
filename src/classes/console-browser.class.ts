enum BrowserConsoleLevel {
  LOG = 'LOG',
  INF = 'INFO',
  WRN = 'WARNING',
  ERR = 'ERROR',
  DBG = 'DEBUG',
  CST = 'CUSTOM',
}

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
const LEVEL_STYLES: Record<BrowserConsoleLevel, string> = {
  [BrowserConsoleLevel.LOG]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.GREEN}`,
  [BrowserConsoleLevel.INF]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.BLUE}`,
  [BrowserConsoleLevel.WRN]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.BLACK} ${background.YELLOW}`,
  [BrowserConsoleLevel.ERR]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.RED}`,
  [BrowserConsoleLevel.DBG]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.BLACK} ${background.WHITE}`,
  [BrowserConsoleLevel.CST]: `${padding} ${fontWeightBold} ${borderRadius} ${foreground.WHITE} ${background.MAGENTA}`,
};
const RESET_STYLES = `
  padding: 0;
  font-weight: initial;
  border-radius:0;
  color: initial;
  background-color: initial;
`;

// Helper for time and date formatting
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

interface ConsoleBrowserOptionsInterface {
  color?: boolean;
  info?: boolean;
  name?: string;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
}

class ConsoleBrowserClass {
  private readonly performanceStart: number;

  public constructor(private readonly options: ConsoleBrowserOptionsInterface = {}) {
    this.performanceStart = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  public log(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.LOG, args);
  }

  public info(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.INF, args);
  }

  public warn(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.WRN, args);
  }

  public error(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.ERR, args);
  }

  public debug(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.DBG, args);
  }

  public custom(...args: unknown[]): unknown[] {
    return this.wrap(BrowserConsoleLevel.CST, args);
  }

  private wrap(level: BrowserConsoleLevel, args: unknown[]): unknown[] {
    const styleList: string[] = [];
    const templateList: string[] = [];
    // Add log level, if enabled
    if (this.options.info) {
      templateList.push(`%c${level}`);
      styleList.push(this.options.color ? LEVEL_STYLES[level] : '');
    }
    // Add optional metadata (name, date, time, performance)
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

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

export class ConsoleClass {
  private readonly consoleClass: ConsoleBrowserClass;

  public constructor(options: ConsoleBrowserOptionsInterface) {
    this.consoleClass = new ConsoleBrowserClass(options);
  }

  public override(): void {
    // console.log = (...args: unknown[]): void => {
    //   consoleLog(...this.consoleClass.log(...args));
    // };
    // console.warn = (...args: unknown[]): void => {
    //   consoleWarn.bind(console, ...this.consoleClass.warn(...args))(...args);
    // };
    // console.info = (...args: unknown[]): void => {
    //   consoleInfo.bind(console, ...this.consoleClass.info(...args))(...args);
    // };
    console.log = console.log.bind(this, ...this.consoleClass.log());
    console.warn = console.warn.bind(this, ...this.consoleClass.warn());
    console.info = console.error.bind(this, ...this.consoleClass.info());
    console.error = console.error.bind(this, ...this.consoleClass.error());
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }
}
