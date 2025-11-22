import { HttpStatus } from '@nestjs/common';
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
    const message = messageIsJson ? error.message.toString() : DataHelper.convertToJson(error.message);
    super(message);
    this.name = error.name || 'ErrorClass';
    this.message = message;
    this.messageIsJson = messageIsJson;
    if (error.stack) {
      this.stack = error.stack;
    }
    this.status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  public static filterStack(stack = '', excludePath = ''): ParserTraceInterface[] {
    // return ErrorClass.parseStack(stack)
    //   .filter((trace) => {
    //     return !trace.file.includes('node_modules/') && !trace.file.includes('node:');
    //   })
    //   .map((trace) => {
    //     return {
    //       ...trace,
    //       file: excludePath ? DataHelper.excludePath(trace.file, excludePath) : trace.file,
    //     };
    //   });
    const parsed = ParserHelper.stack(stack);
    const hasExclude = !!excludePath;
    const result: ParserTraceInterface[] = [];
    for (const trace of parsed) {
      const file = trace.file;
      if (file.includes('node_modules/') || file.includes('node:')) continue;
      result.push({
        caller: trace.caller,
        method: trace.method,
        file: hasExclude ? DataHelper.excludePath(file, excludePath) : file,
      });
    }
    return result;
  }
}
