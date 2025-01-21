import { HttpException, HttpStatus } from '@nestjs/common';
import { ApolloError } from 'apollo-server-errors';
import * as mongoose from 'mongoose';
import { ErrorClass, ErrorClassInterface } from '../classes/error.class';
import { ApolloCodeEnum } from '../declarations/apollo-code.enum';
import {
  ExceptionResponseContextEnum,
  ExceptionResponseInterface,
  ExceptionResponseTypeEnum,
} from '../declarations/exception-response.interface';

export interface ExceptionInterface extends ErrorClassInterface {
  type: ExceptionResponseTypeEnum;
  code: ApolloCodeEnum;
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
    } else if (error instanceof mongoose.mongo.MongoError) {
      result = this.castMongoError(error);
    } else if (error instanceof ApolloError) {
      result = this.castApolloError(error);
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
      'context' in exception &&
      'code' in exception &&
      'message' in exception &&
      'metadata' in exception &&
      'name' in exception &&
      'payload' in exception &&
      'status' in exception &&
      'timestamp' in exception &&
      'trace' in exception &&
      'type' in exception &&
      // Enum checks
      Object.values(ApolloCodeEnum).includes(exception.code as ApolloCodeEnum) &&
      Object.values(ExceptionResponseContextEnum).includes(exception.context as ExceptionResponseContextEnum) &&
      Object.values(ExceptionResponseTypeEnum).includes(exception.type as ExceptionResponseTypeEnum) &&
      // Type checks
      typeof exception.message === 'string' &&
      typeof exception.metadata !== 'undefined' &&
      typeof exception.name === 'string' &&
      typeof exception.payload === 'object' &&
      typeof exception.status === 'number' &&
      typeof exception.timestamp === 'string' &&
      // Array checks
      Array.isArray(exception.trace) &&
      exception.trace.every((item: unknown) => typeof item === 'string') &&
      // Null checks
      exception.payload !== null
    );
  }

  private castHttpException(exception: HttpException): ExceptionInterface {
    const response = exception.getResponse();
    return {
      name: typeof response === 'string' ? response : exception.name,
      message: exception.message,
      // details: typeof response === 'object' ? response : exception.message,
      details: typeof response === 'object' ? response : undefined,
      type: ExceptionResponseTypeEnum.HTTP_EXCEPTION,
      status: exception.getStatus(),
      code: this.codeFromHttpStatus(exception.getStatus()),
      stack: exception.stack,
    };
  }

  private castApolloError(error: ApolloError): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      details: error.extensions,
      type: ExceptionResponseTypeEnum.APOLLO_ERROR,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: (error.extensions as Record<string, ApolloCodeEnum>).code || ApolloCodeEnum.INTERNAL_SERVER_ERROR,
      stack: error.stack,
    };
  }

  private castMongoError(error: mongoose.mongo.MongoError): ExceptionInterface {
    let details;
    switch (error.code) {
      case 11000:
        const message = error.message.match(/E([0-9]+) (.+) collection: (.+) index: (.+) dup key: ({ .+ })/);
        details = message
          ? {
              error: message[2],
              code: parseInt(message[1]),
              collection: message[3],
              index: message[4],
              data: message[5],
            }
          : undefined;
        break;
      default:
        details = undefined;
    }
    return {
      name: error.name,
      message: error.message,
      details: details,
      type: ExceptionResponseTypeEnum.MONGO_ERROR,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      stack: error.stack,
    };
  }

  private castErrorClass(error: ErrorClass): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      details: error.details,
      type: ExceptionResponseTypeEnum.ERROR_CLASS,
      status: error.status,
      code: this.codeFromHttpStatus(error.status),
      stack: error.stack,
    };
  }

  private castError(error: Error): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      details: undefined,
      type: ExceptionResponseTypeEnum.ERROR,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      stack: error.stack,
    };
  }

  private castUnknown(error: unknown): ExceptionInterface {
    return {
      name: ExceptionSingleton.name,
      message: typeof error === 'string' ? error : '',
      details: typeof error === 'object' && error !== null ? error : undefined,
      type: ExceptionResponseTypeEnum.UNKNOWN,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      stack: new Error().stack,
    };
  }

  private codeFromHttpStatus(status?: number): ApolloCodeEnum {
    switch (status) {
      case 400:
        // HttpStatus.BAD_REQUEST:
        return ApolloCodeEnum.BAD_USER_INPUT;
      case 403:
        // HttpStatus.FORBIDDEN:
        return ApolloCodeEnum.FORBIDDEN;
      case 401:
        // HttpStatus.UNAUTHORIZED
        return ApolloCodeEnum.UNAUTHENTICATED;
      case 500:
        // HttpStatus.INTERNAL_SERVER_ERROR
        return ApolloCodeEnum.INTERNAL_SERVER_ERROR;
      default:
        return ApolloCodeEnum.UNKNOWN;
    }
  }
}

export const ExceptionHelper = ExceptionSingleton.getInstance();
