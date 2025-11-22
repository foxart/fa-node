import { HttpException, HttpStatus } from '@nestjs/common';
import { ApolloError } from 'apollo-server-errors';
import * as mongoose from 'mongoose';
import { ErrorClass } from '../classes/error.class';
import { ApolloCodeEnum } from '../declarations/apollo-code.enum';
import {
  ExceptionResponseContextEnum,
  ExceptionResponseInterface,
  ExceptionResponseTypeEnum,
} from '../declarations/exception-response.interface';
import { ConverterHelper } from './converter.helper';

export interface ExceptionInterface {
  name: string;
  message: string;
  status: HttpStatus;
  code: ApolloCodeEnum;
  type: ExceptionResponseTypeEnum;
  stack?: string;
}

class ExceptionSingleton {
  private static self: ExceptionSingleton;

  public static getInstance(): ExceptionSingleton {
    if (!ExceptionSingleton.self) {
      ExceptionSingleton.self = new ExceptionSingleton();
    }
    return ExceptionSingleton.self;
  }

  public castToException(error: unknown): ExceptionInterface {
    let result;
    if (error instanceof HttpException) {
      result = this.castHttpException(error);
    } else if (error instanceof ApolloError) {
      result = this.castApolloError(error);
    } else if (error instanceof mongoose.mongo.MongoError) {
      result = this.castMongoError(error);
    } else if (error instanceof ErrorClass) {
      result = this.castErrorClass(error);
    } else if (error instanceof Error) {
      result = this.castError(error);
    } else {
      result = this.castUnknown(error);
    }
    return result;
  }

  public isExceptionResponse(exception: unknown): exception is ExceptionResponseInterface {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      'context' in exception &&
      'message' in exception &&
      'metadata' in exception &&
      'name' in exception &&
      'payload' in exception &&
      'timestamp' in exception &&
      // 'trace' in exception &&
      'type' in exception &&
      // Enum checks
      Object.values(ApolloCodeEnum).includes(exception.code as ApolloCodeEnum) &&
      Object.values(ExceptionResponseContextEnum).includes(exception.context as ExceptionResponseContextEnum) &&
      Object.values(ExceptionResponseTypeEnum).includes(exception.type as ExceptionResponseTypeEnum) &&
      // Type checks
      typeof exception.message === 'string' &&
      typeof exception.metadata === 'object' &&
      typeof exception.name === 'string' &&
      typeof exception.payload === 'object' &&
      typeof exception.timestamp === 'string' &&
      // Array checks
      // Array.isArray(exception.trace) &&
      // exception.trace.every((item: unknown) => typeof item === 'string') &&
      // Null checks
      exception.payload !== null
    );
  }

  private castHttpException(exception: HttpException): ExceptionInterface {
    return {
      name: exception.name,
      message: exception.message,
      status: exception.getStatus(),
      code: this.codeFromHttpStatus(exception.getStatus()),
      type: ExceptionResponseTypeEnum.HTTP_EXCEPTION,
      stack: exception.stack,
    };
  }

  private castApolloError(error: ApolloError): ExceptionInterface {
    const extensions = error.extensions as {
      http?: { status?: number };
      code?: ApolloCodeEnum;
    };
    return {
      name: error.name,
      message: error.message,
      status: extensions?.http?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      code: extensions?.code || ApolloCodeEnum.INTERNAL_SERVER_ERROR,
      type: ExceptionResponseTypeEnum.APOLLO_ERROR,
      stack: error.stack,
    };
  }

  private castMongoError(error: mongoose.mongo.MongoError): ExceptionInterface {
    let message;
    switch (error.code) {
      case 11000:
        const errorMessage = error.message.match(/E([0-9]+) (.+) collection: (.+) index: (.+) dup key: ({ .+ })/);
        message = errorMessage
          ? {
              error: errorMessage[2],
              code: parseInt(errorMessage[1]),
              collection: errorMessage[3],
              index: errorMessage[4],
              data: errorMessage[5],
            }
          : '';
        break;
      default:
        message = error.message;
    }
    return {
      name: error.name,
      message: ConverterHelper.toJson(message),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ExceptionResponseTypeEnum.MONGO_ERROR,
      stack: error.stack,
    };
  }

  private castErrorClass(error: ErrorClass): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: this.codeFromHttpStatus(error.status),
      type: ExceptionResponseTypeEnum.ERROR_CLASS,
      stack: error.stack,
    };
  }

  private castError(error: Error): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ExceptionResponseTypeEnum.ERROR,
      stack: error.stack,
    };
  }

  private castUnknown(error: unknown): ExceptionInterface {
    return {
      name: ExceptionSingleton.name,
      message: typeof error === 'object' ? ConverterHelper.toJson(error) : '',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ExceptionResponseTypeEnum.UNKNOWN,
      stack: new Error().stack,
    };
  }

  private codeFromHttpStatus(status?: HttpStatus): ApolloCodeEnum {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApolloCodeEnum.BAD_USER_INPUT;
      case HttpStatus.FORBIDDEN:
        return ApolloCodeEnum.FORBIDDEN;
      case HttpStatus.UNAUTHORIZED:
        return ApolloCodeEnum.UNAUTHENTICATED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ApolloCodeEnum.INTERNAL_SERVER_ERROR;
      default:
        return ApolloCodeEnum.UNKNOWN;
    }
  }
}

export const ExceptionHelper = ExceptionSingleton.getInstance();
