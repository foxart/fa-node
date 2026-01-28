interface ConsoleInterface {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

class Console {
  private readonly consoleInterface: ConsoleInterface;

  public constructor() {
    this.consoleInterface = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  public override(consoleInterface: ConsoleInterface): void {
    console.log = consoleInterface.log.bind(consoleInterface);
    console.info = consoleInterface.info.bind(consoleInterface);
    console.warn = consoleInterface.warn.bind(consoleInterface);
    console.error = consoleInterface.error.bind(consoleInterface);
    console.debug = consoleInterface.debug.bind(consoleInterface);
  }

  public restore(): void {
    console.log = this.consoleInterface.log.bind(this.consoleInterface);
    console.info = this.consoleInterface.info.bind(this.consoleInterface);
    console.warn = this.consoleInterface.warn.bind(this.consoleInterface);
    console.error = this.consoleInterface.error.bind(this.consoleInterface);
    console.debug = this.consoleInterface.debug.bind(this.consoleInterface);
  }
}

export const ConsoleHelper = new Console();
