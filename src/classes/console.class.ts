import { ConsoleOptionsInterface, LoggerSystemClass } from './logger-system.class';

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

export class ConsoleClass {
  private readonly consoleSystem: LoggerSystemClass;

  private readonly consoleOriginal: Console;

  public constructor(options: ConsoleOptionsInterface) {
    this.consoleOriginal = console;
    this.consoleSystem = new LoggerSystemClass(options);
  }

  public override(): void {
    console.log = this.consoleSystem.log.bind(this.consoleSystem);
    console.info = this.consoleSystem.info.bind(this.consoleSystem);
    console.warn = this.consoleSystem.warn.bind(this.consoleSystem);
    console.error = this.consoleSystem.error.bind(this.consoleSystem);
    console.debug = this.consoleSystem.debug.bind(this.consoleSystem);
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }
}
