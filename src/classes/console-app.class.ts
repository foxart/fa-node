import { ConsoleNodeClass, ConsoleOptionsInterface } from './console-node.class';

export class ConsoleAppClass {
  private readonly consoleClass: ConsoleNodeClass;

  private readonly console: Console;

  public constructor(options: ConsoleOptionsInterface) {
    this.console = console;
    this.consoleClass = new ConsoleNodeClass(options);
  }

  public override(): void {
    console.log = this.consoleClass.log.bind(this.consoleClass);
    console.info = this.consoleClass.info.bind(this.consoleClass);
    console.warn = this.consoleClass.warn.bind(this.consoleClass);
    console.error = this.consoleClass.error.bind(this.consoleClass);
    console.debug = this.consoleClass.debug.bind(this.consoleClass);
  }

  public restore(): void {
    console.log = this.console.log.bind(this.console);
    console.info = this.console.info.bind(this.console);
    console.warn = this.console.warn.bind(this.console);
    console.error = this.console.error.bind(this.console);
    console.debug = this.console.debug.bind(this.console);
  }
}
