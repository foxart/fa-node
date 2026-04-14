import { Injectable } from '@nestjs/common';
import { LoggerNest } from '../logger/logger.nest';

@Injectable()
export class LoggerNestService extends LoggerNest {
  public constructor() {
    super({
      color: true,
      level: true,
      time: true,
      metadata: true,
      performance: true,
    });
  }
}
