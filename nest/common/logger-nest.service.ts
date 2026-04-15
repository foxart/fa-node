import { Injectable } from '@nestjs/common';
import { LoggerConfigInterface } from '../../src/logger/logger.class';
import { LoggerNest } from '../../src/logger/logger.nest';
import { LOGGER_CONFIG } from '../config/logger.config';

const LOGGER_NEST_CONFIG: LoggerConfigInterface = {
  ...LOGGER_CONFIG,
  env: 'NEST',
  link: true,
};

@Injectable()
export class LoggerNestService extends LoggerNest {
  public constructor() {
    super(LOGGER_NEST_CONFIG);
  }
}
