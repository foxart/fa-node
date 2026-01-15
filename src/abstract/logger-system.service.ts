import { Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_LEVEL_ENUM, LoggerAbstract } from './logger.abstract';

@Injectable()
export class LoggerSystemService extends LoggerAbstract implements LoggerService {
  public log(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout(this.level.LOG, context, message, ...params);
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
      this.stdout(this.level.ERR, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout(this.level.WRN, context, message, ...params);
  }

  public debug(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout(this.level.DBG, context, message, ...params);
  }

  public verbose(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout(this.level.INF, context, message, ...params);
  }

  public fatal(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout(this.level.ERR, context, message, ...params);
  }

  private message(level: LOGGER_LEVEL_ENUM, message: unknown, caller: string): string {
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
      const color = this.getColor(level);
      return this.colorizeString(message, color);
    } else {
      if (typeof message === 'string') {
        return this.colorizeString(message, this.color.white);
      }
      return this.prettify(message);
    }
  }

  private stdout(level: LOGGER_LEVEL_ENUM, context: string | undefined, message: unknown, ...params: unknown[]): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    const stack = this.parseStack();
    const caller = context ?? stack.caller;
    this.writeHeader(level, caller, this.getMethodName(stack.method));
    const data = [message, ...params];
    data.forEach((item, i) => {
      process.stdout.write(this.message(level, item, caller));
      if (i !== data.length - 1) {
        process.stdout.write(' ');
      }
    });
    process.stdout.write('\n');
  }
}
