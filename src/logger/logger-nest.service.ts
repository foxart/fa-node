import { Injectable } from '@nestjs/common';
import { LoggerNestClass } from './logger-nest.class';

@Injectable()
export class LoggerNestService extends LoggerNestClass {
  public constructor() {
    super({});
  }
}
