import { Injectable } from '@nestjs/common';
import { LoggerNest } from './logger.nest';

@Injectable()
export class LoggerNestService extends LoggerNest {
  public constructor() {
    super({});
  }
}
