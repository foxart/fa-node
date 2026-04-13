import { LoggerBrowserClass } from './logger-browser.class';

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

export class LoggerBrowser extends LoggerBrowserClass {
  private readonly logger: LoggerBrowserClass;

  public override(): void {
    console.log = console.log.bind(this, ...this.logger.log());
    console.warn = console.warn.bind(this, ...this.logger.warn());
    console.info = console.info.bind(this, ...this.logger.info());
    console.error = console.error.bind(this, ...this.logger.error());
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }
}
