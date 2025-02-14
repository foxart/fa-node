import { ConsoleClass, ConsoleServiceOptionsInterface } from '../classes/console.class';

class ConsoleSingleton {
  private static self: ConsoleSingleton;

  private consoleService: ConsoleClass;

  private readonly console: Console;

  private constructor() {
    this.console = console;
  }

  public static getInstance(): ConsoleSingleton {
    if (!ConsoleSingleton.self) {
      ConsoleSingleton.self = new ConsoleSingleton();
    }
    return ConsoleSingleton.self;
  }

  public override(options: ConsoleServiceOptionsInterface): void {
    this.consoleService = new ConsoleClass(options);
    console.log = this.consoleService.log.bind(this.consoleService) as typeof console.log;
    console.info = this.consoleService.info.bind(this.consoleService) as typeof console.info;
    console.warn = this.consoleService.warn.bind(this.consoleService) as typeof console.warn;
    console.error = this.consoleService.error.bind(this.consoleService) as typeof console.error;
    console.debug = this.consoleService.debug.bind(this.consoleService) as typeof console.debug;
  }

  public restore(): void {
    console.log = this.console.log.bind(this.console);
    console.info = this.console.info.bind(this.console);
    console.warn = this.console.warn.bind(this.console);
    console.error = this.console.error.bind(this.console);
    console.debug = this.console.debug.bind(this.console);
  }
}

export const ConsoleHelper = ConsoleSingleton.getInstance();
