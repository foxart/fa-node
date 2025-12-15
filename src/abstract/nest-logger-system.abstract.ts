import { LoggerService } from '@nestjs/common';
import { ConsoleOptionsInterface } from '../classes/logger-system.class';
import { StackToTraceInterface } from '../helpers/data.helper';
import { NestLoggerAbstract, NestLoggerLevelType } from './nest-logger.abstract';

class Console extends NestLoggerAbstract {
  public constructor(options: ConsoleOptionsInterface) {
    super(options);
  }
}

export abstract class NestLoggerSystemAbstract implements LoggerService {
  private readonly console: Console;

  protected constructor(options: ConsoleOptionsInterface) {
    this.console = new Console(options);
  }

  private get metadata(): StackToTraceInterface {
    const { caller, file } = this.console.metadata(new Error().stack, 2);
    return { caller, file, method: undefined };
  }

  public log(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('LOG', this.metadata, context, message, ...params);
  }

  public error(message: unknown, ...params: unknown[]): void {
    let context: string | undefined;
    let stack: string | undefined;
    // Если первый параметр — стек
    if (params.length > 0 && typeof params[0] === 'string' && /\n\s*at\s+/m.test(params[0])) {
      stack = params.shift() as string;
    }
    // Если последний параметр — контекст
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }
    const caller = context ?? '';
    // Сформируем массив сообщений для вывода
    const outputMessages: unknown[] = [];
    // Проверяем, не дублируется ли message в стеке
    const isErrorMessageDuplicatedInStack = typeof message === 'string' && stack?.includes(message);
    if (!isErrorMessageDuplicatedInStack) {
      outputMessages.push(message);
    }
    // Добавим стек, если есть
    if (stack) {
      outputMessages.push(stack);
    }
    // Перебираем оставшиеся параметры — если Error, развернём message и stack
    for (const param of params) {
      if (param instanceof Error) {
        outputMessages.push(param.message);
        if (param.stack) {
          outputMessages.push(param.stack);
        }
      } else {
        outputMessages.push(param);
      }
    }
    // Вызовем output с первым сообщением как message, остальные — params
    const [firstMessage, ...restMessages] = outputMessages.length > 0 ? outputMessages : [undefined];
    if (firstMessage !== undefined) {
      this.stdout('ERR', this.metadata, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('WRN', this.metadata, context, message, ...params);
  }

  public debug(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('DBG', this.metadata, context, message, ...params);
  }

  public verbose(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('INF', this.metadata, context, message, ...params);
  }

  public fatal(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('FTL', this.metadata, context, message, ...params);
  }

  protected stdout(
    level: NestLoggerLevelType,
    metadata: StackToTraceInterface,
    context: string | undefined,
    message: unknown,
    ...params: [...unknown[]] | [...unknown[], string]
  ): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    const caller = context ? context : metadata.caller;
    this.console.stdout(level, { caller, method: metadata.method, file: metadata.file }, message);
    params.forEach((item) => {
      this.console.stdout(level, { caller, method: metadata.method, file: metadata.file }, item);
    });
  }
}
