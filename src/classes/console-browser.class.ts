export enum BrowserConsoleLevel {
  LOG = 'LOG',
  INF = 'INFO',
  WRN = 'WARNING',
  ERR = 'ERROR',
  DBG = 'DEBUG',
  CST = 'CUSTOM',
}

export interface BrowserConsoleOptions {
  color?: boolean;
  info?: boolean;
  name?: string;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
}

const LEVEL_STYLES: Record<BrowserConsoleLevel, string> = {
  [BrowserConsoleLevel.LOG]: 'color:#fff;background:#27ae60;font-weight:bold;padding:2px 8px;border-radius:4px;',
  [BrowserConsoleLevel.INF]: 'color:#fff;background:#2980b9;font-weight:bold;padding:2px 8px;border-radius:4px;',
  [BrowserConsoleLevel.WRN]: 'color:#000;background:#f1c40f;font-weight:bold;padding:2px 8px;border-radius:4px;',
  [BrowserConsoleLevel.ERR]: 'color:#fff;background:#e74c3c;font-weight:bold;padding:2px 8px;border-radius:4px;',
  [BrowserConsoleLevel.DBG]: 'color:#000;background:#bdc3c7;font-weight:bold;padding:2px 8px;border-radius:4px;',
  [BrowserConsoleLevel.CST]: 'color:#fff;background:#8e44ad;font-weight:bold;padding:2px 8px;border-radius:4px;',
};

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

export class ConsoleBrowserClass {
  private readonly performanceStart: number;

  public constructor(private readonly options: BrowserConsoleOptions = {}) {
    this.performanceStart = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  public log(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.LOG, args);
  }

  public info(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.INF, args);
  }

  public warn(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.WRN, args);
  }

  public error(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.ERR, args);
  }

  public debug(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.DBG, args);
  }

  public custom(...args: unknown[]): void {
    this.print(BrowserConsoleLevel.CST, args);
  }

  private print(level: BrowserConsoleLevel, args: unknown[]): void {
    const style = this.options.color ? LEVEL_STYLES[level] : '';
    // Compose info prefix, e.g., name | date | time
    const info: string[] = [];
    if (this.options.name) info.push(`%c${this.options.name}`, 'color:#888;font-weight:bold');
    if (this.options.date) info.push(`%c${formatDate()}`, 'color:#16a085');
    if (this.options.time) info.push(`%c${formatTime()}`, 'color:#16a085');
    // Perf
    let performanceMs = null;
    if (this.options.performance && typeof performance !== 'undefined') {
      performanceMs = Math.floor(performance.now() - this.performanceStart);
      info.push(`%c+${performanceMs}ms`, 'color:#3498db;font-weight:bold');
    }
    // Level
    const mainPrefix = this.options.info ? [`%c${level}`, style] : [];
    // Flatten rest args. Errors will be prettified.
    const displayArgs = args.map((record) => {
      if (record instanceof Error) {
        return `%c${record.name}: %c${record.message}`;
      }
      return record;
    });
    // Compose style array
    const styles: string[] = [];
    if (mainPrefix.length) styles.push(mainPrefix[1]);
    info.forEach((_, idx) => {
      // Only add styles for odd indices
      if (idx % 2 === 1) styles.push(info[idx]);
    });
    // Errors styles
    args.forEach((record) => {
      if (record instanceof Error) {
        styles.push('color:#e74c3c;font-weight:bold', 'color:#c0392b;');
      }
    });
    // Build final log string and styles
    const logParts: unknown[] = [];
    if (mainPrefix.length) logParts.push(mainPrefix[0]);
    info.forEach((val, idx) => {
      if (idx % 2 === 0) logParts.push(val); // skip styles, used separately
    });
    displayArgs.forEach((arg) => logParts.push(arg));
    switch (level) {
      case BrowserConsoleLevel.ERR:
        console.error(...logParts, ...styles);
        break;
      case BrowserConsoleLevel.WRN:
        console.warn(...logParts, ...styles);
        break;
      default:
        console.log(...logParts, ...styles);
        break;
    }
  }
}
