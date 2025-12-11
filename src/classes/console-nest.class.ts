import { ColorHelper } from '../helpers/color.helper';
import { DataHelper } from '../helpers/data.helper';
import { ParserHelper, ParserTraceInterface } from '../helpers/parser.helper';
import { ConsoleOptionsInterface, ConsoleSystemClass } from './console-system.class';
import { ErrorClass } from './error.class';

const { foreground, effect } = ColorHelper;
export type ConsoleNestLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export class ConsoleNestClass {
  private readonly placeholderRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")/g;
  private readonly placeholderSplitRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")|([^{}'"]+)/g;
  private readonly console: ConsoleSystemClass;

  public constructor(private readonly options: ConsoleOptionsInterface) {
    this.console = new ConsoleSystemClass(options);
  }

  public metadata(stack = '', level: number): ParserTraceInterface {
    const trace = ParserHelper.stack(stack);
    const metadata = trace[level];
    if (metadata) {
      return {
        file: DataHelper.excludePath(metadata.file, process.cwd()),
        caller: metadata.caller,
        method: metadata.method,
      };
    }
    const nextMetadata = trace.slice(level).find((item) => {
      return item.caller && item.method;
    });
    return {
      file: DataHelper.excludePath(nextMetadata?.file ?? '', process.cwd()),
      caller: nextMetadata?.caller ?? '',
      method: nextMetadata?.method ?? '',
    };
  }

  public stdout(level: ConsoleNestLevelType, metadata: ParserTraceInterface, message: unknown | unknown[]): void {
    this.printLevel(level);
    this.console.printInfo(level);
    this.printCaller(level, metadata.caller, metadata.method);
    if (Array.isArray(message)) {
      message.forEach((item, index) => {
        this.printMessage(level, item, metadata.caller);
        if (index !== message.length - 1) {
          process.stdout.write('\n');
        }
      });
    } else {
      this.printMessage(level, message, metadata.caller);
    }
    this.console.printPerformance();
    if (level === 'DBG') {
      this.console.printTrace(level, DataHelper.traceListFromErrorStack(new Error().stack));
    }
    this.printLink(level, metadata.file);
    this.console.stdout('\n');
  }

  private printLevel(level: ConsoleNestLevelType): void {
    if (!this.options.info) {
      return;
    }
    const color = this.console.getForeground(level);
    this.console.stdout(ColorHelper.wrapData(`[`, [effect.RESET, effect.BOLD]));
    this.console.stdout(ColorHelper.wrapData(level, [effect.BOLD, color]));
    this.console.stdout(ColorHelper.wrapData(`]`, [effect.RESET, effect.BOLD]));
    this.console.stdout(' ');
  }

  private printCaller(level: ConsoleNestLevelType, caller: string, method: string | undefined): void {
    const color = this.console.getForeground(level);
    this.console.stdout(caller);
    if (method) {
      this.console.stdout(ColorHelper.wrapData(`/`, [effect.BOLD, color]));
      this.console.stdout(ColorHelper.wrapData(method, [foreground.CYAN]));
    }
    this.console.stdout(' ');
  }

  private printMessage(level: ConsoleNestLevelType, message: unknown, caller: string): void {
    if (
      typeof message === 'string' &&
      [
        'NestFactory',
        'InstanceLoader',
        'WebSocketsController',
        'RouterExplorer',
        'RoutesResolver',
        'GraphQLModule',
        'NestApplication',
      ].includes(caller)
    ) {
      const color = this.console.getForeground(level);
      this.placeholderRegExp.lastIndex = 0;
      if (this.placeholderRegExp.test(message)) {
        this.placeholderSplitRegExp.lastIndex = 0;
        const data = message.replace(this.placeholderSplitRegExp, (...args) => {
          const [, bracket, single, double, plain] = args as [
            string,
            string | undefined,
            string | undefined,
            string | undefined,
            string | undefined,
          ];
          if (bracket || single || double) {
            return ColorHelper.wrapData(bracket ?? single ?? double ?? '', [foreground.WHITE]);
          }
          return ColorHelper.wrapData(plain ?? '', [color]);
        });
        this.console.stdout(data);
      } else {
        this.console.stdout(ColorHelper.wrapData(message, [color]));
      }
    } else if (message instanceof Error || message instanceof ErrorClass) {
      this.console.printError(message);
    } else {
      this.console.stdout(this.console.prettify(message));
    }
    this.console.stdout(' ');
  }

  private printLink(level: ConsoleNestLevelType, filePath: string): void {
    if (!this.options.link) {
      return;
    }
    this.console.stdout('\n');
    if (this.options.info) {
      this.console.stdout(ColorHelper.wrapData('at ', [effect.BOLD, this.console.getForeground(level)]));
    }
    this.console.stdout(DataHelper.excludePath(filePath));
  }
}
