import { ConsoleOptionsInterface, ConsoleSystemClass } from './console-system.class';

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

export class ConsoleClass {
  private readonly consoleClass: ConsoleSystemClass;

  private readonly console: Console;

  public constructor(options: ConsoleOptionsInterface) {
    this.console = console;
    this.consoleClass = new ConsoleSystemClass(options);
  }

  public override(): void {
    console.log = this.consoleClass.log.bind(this.consoleClass);
    console.info = this.consoleClass.info.bind(this.consoleClass);
    console.warn = this.consoleClass.warn.bind(this.consoleClass);
    console.error = this.consoleClass.error.bind(this.consoleClass);
    console.debug = this.consoleClass.debug.bind(this.consoleClass);
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }
}
