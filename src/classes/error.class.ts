import { CheckHelper } from '@common/helpers/check.helper';
import { ConverterHelper } from '@common/helpers/converter.helper';
import { HttpStatus } from '@nestjs/common';

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
    const messageIsJson = CheckHelper.isPrimitive(error.message);
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
