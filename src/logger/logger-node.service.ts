import { Injectable } from '@nestjs/common';
import { DataHelper } from '../helpers/data.helper';
import { LoggerNode } from './logger.node';
import { LoggerLevelType, LoggerMetadataInterface, LoggerOriginInterface, StackFrameInterface } from './logger.class';

interface LoggerAppInterface {
  level: LoggerLevelType;
  data: unknown | unknown[];
  keywords?: string[];
  metadata?: LoggerMetadataInterface;
  expiresAt?: Date;
}

@Injectable()
export class LoggerNodeService extends LoggerNode {
  public constructor() {
    super({});
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
