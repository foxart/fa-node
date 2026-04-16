import { LOGGER_CONFIG } from '@nest/config/logger.config';
import { Injectable } from '@nestjs/common';
import { LoggerConfigInterface, LoggerNest } from '../../src';

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
