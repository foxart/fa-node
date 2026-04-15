import { Injectable } from '@nestjs/common';
import { DataHelper } from '../../src/helpers/data.helper';
import {
  LoggerConfigInterface,
  LoggerLevelType,
  LoggerMetadataInterface,
  LoggerOriginInterface,
  StackFrameInterface,
} from '../../src/logger/logger.class';
import { LoggerNode } from '../../src/logger/logger.node';
import { LOGGER_CONFIG } from '../config/logger.config';

interface LoggerAppInterface {
  level: LoggerLevelType;
  data: unknown | unknown[];
  keywords?: string[];
  metadata?: LoggerMetadataInterface;
  expiresAt?: Date;
}

const LOGGER_NODE_CONFIG: LoggerConfigInterface = {
  ...LOGGER_CONFIG,
  env: 'NODE',
  errorStack: true,
  link: true,
};

@Injectable()
export class LoggerNodeService extends LoggerNode {
  public constructor() {
    super(LOGGER_NODE_CONFIG);
  }

  public repository(dto: LoggerAppInterface): void {
    const origin = this.origin;
    const originFrame = origin.frame;
    const originForStdout: LoggerOriginInterface = this.buildOriginForStdout(origin, dto.metadata);

    if (dto.keywords) {
      this.write(dto.level, originForStdout, dto.data, ...dto.keywords);
    } else {
      this.write(dto.level, originForStdout, dto.data);
    }

    /** RepositoryAppLogService */
    const keywords = DataHelper.keywordListFromWordList(
      [dto.metadata?.caller ?? originFrame?.caller, dto.metadata?.method ?? originFrame?.method].filter((item) => {
        return item !== undefined;
      }),
    );

    const metadata = {
      file: originFrame?.file ?? dto.metadata?.linkFile ?? 'unknown',
      caller: dto.metadata?.caller ?? originFrame?.caller,
      method: dto.metadata?.method ?? originFrame?.method,
    };
    console.log(keywords, metadata);
  }

  private buildOriginForStdout(
    origin: LoggerOriginInterface,
    metadata?: LoggerMetadataInterface,
  ): LoggerOriginInterface {
    if (!metadata) {
      return origin;
    }

    const baseFrame = origin.frame;
    const frame: StackFrameInterface | undefined = baseFrame
      ? {
          ...baseFrame,
          caller: metadata.caller,
          method: metadata.method,
        }
      : metadata.linkFile
        ? {
            file: metadata.linkFile,
            caller: metadata.caller,
            method: metadata.method,
          }
        : undefined;

    return {
      ...origin,
      frame,
    };
  }
}
