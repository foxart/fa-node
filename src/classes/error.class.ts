import { HttpStatus } from '@nestjs/common';
import { ConverterHelper } from '../helpers/converter.helper';
import { DataHelper } from '../helpers/data.helper';
import { ParserHelper, ParserTraceInterface } from '../helpers/parser.helper';

export interface ErrorClassInterface {
  name?: string;
  message: string | object | unknown[];
  stack?: string;
  status?: HttpStatus;
}

export class ErrorClass extends Error {
  // private static readonly stackRegexp = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

  public readonly messageIsJson: boolean;

  public readonly status: HttpStatus;

  public constructor(error: ErrorClassInterface) {
    const messageIsJson = DataHelper.isPrimitive(error.message);
    const message = messageIsJson ? error.message.toString() : ConverterHelper.toJson(error.message);
    super(message);
    this.name = error.name || 'ErrorClass';
    this.message = message;
    this.messageIsJson = messageIsJson;
    if (error.stack) {
      this.stack = error.stack;
    }
    this.status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  public static traceListFromStack(stack = ''): ParserTraceInterface[] {
    if (!stack) return [];
    const isNode = typeof process !== 'undefined' && process?.versions?.node;
    const traceList = ParserHelper.stack(stack);
    const result: ParserTraceInterface[] = [];
    for (const trace of traceList) {
      const { caller, method, file } = trace;
      if (file.includes('node_modules/') || file.includes('node:') || (caller === '' && method === '')) {
        continue;
      }
      result.push({
        caller: trace.caller,
        method: trace.method,
        file: isNode ? DataHelper.excludePath(file, process.cwd()) : file,
      });
    }
    return result;
  }

  // public static keywordListFromStack(stack = ''): string[] {
  //   if (!stack) return [];
  //   const set = new Set<string>();
  //   const traceList = ErrorClass.traceListFromStack(stack);
  //   for (const trace of traceList) {
  //     if (trace.caller) {
  //       const callerList = ConverterHelper.splitWords(trace.caller);
  //       for (const caller of callerList) {
  //         set.add(caller.toLowerCase());
  //       }
  //     }
  //     if (trace.method) {
  //       const methodWords = ConverterHelper.splitWords(trace.method);
  //       for (const w of methodWords) {
  //         set.add(w.toLowerCase());
  //       }
  //     }
  //   }
  //   return Array.from(set);
  // }
}
