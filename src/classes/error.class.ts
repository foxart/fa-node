import { HttpStatus } from '@nestjs/common';
import { DataHelper } from '../helpers/data.helper';

export interface ErrorClassInterface {
  name: string;
  message: string | object;
  stack?: string;
  status?: HttpStatus;
}

export class ErrorClass extends Error {
  public readonly messageIsJson: boolean;

  public readonly status: HttpStatus;

  public constructor(error: ErrorClassInterface) {
    super();
    this.name = error.name;
    if (DataHelper.isPrimitive(error.message)) {
      this.message = error.message.toString();
      this.messageIsJson = false;
    } else {
      this.message = DataHelper.toJson(error.message);
      this.messageIsJson = true;
    }
    this.stack = error.stack ? error.stack : this.stack;
    this.status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
