type ConsoleMethod = (...args: unknown[]) => void;

interface ConsoleInterface {
  log: ConsoleMethod;
  info: ConsoleMethod;
  warn: ConsoleMethod;
  error: ConsoleMethod;
  debug: ConsoleMethod;
}

class Console {
  private readonly originalConsole: ConsoleInterface;

  public constructor() {
    this.originalConsole = {
      log: globalThis.console.log.bind(globalThis.console),
      info: globalThis.console.info.bind(globalThis.console),
      warn: globalThis.console.warn.bind(globalThis.console),
      error: globalThis.console.error.bind(globalThis.console),
      debug: globalThis.console.debug.bind(globalThis.console),
    };
  }

  public override(console: ConsoleInterface): void {
    globalThis.console.log = console.log.bind(console);
    globalThis.console.info = console.info.bind(console);
    globalThis.console.warn = console.warn.bind(console);
    globalThis.console.error = console.error.bind(console);
    globalThis.console.debug = console.debug.bind(console);
  }

  public restore(): void {
    globalThis.console.log = this.originalConsole.log;
    globalThis.console.info = this.originalConsole.info;
    globalThis.console.warn = this.originalConsole.warn;
    globalThis.console.error = this.originalConsole.error;
    globalThis.console.debug = this.originalConsole.debug;
  }
}

export const ConsoleHelper = new Console();
