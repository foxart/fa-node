import { LoggerConfigInterface } from '@common/logger/logger.class';
import { LoggerNest } from '@common/logger/logger.nest';
import { Injectable } from '@nestjs/common';
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
