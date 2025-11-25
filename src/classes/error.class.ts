import { HttpStatus } from '@nestjs/common';
import { ConverterHelper } from '../helpers/converter.helper';
import { DataHelper } from '../helpers/data.helper';

export interface ErrorClassInterface {
  name?: string;
  message: string | object | unknown[];
  stack?: string;
  status?: HttpStatus;
}

export class ErrorClass extends Error {
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
}
