import { HttpException, HttpStatus } from '@nestjs/common';
import { ApolloError } from 'apollo-server-errors';
import * as mongoose from 'mongoose';
import { ErrorClass } from '../classes/error.class';
import { ConverterHelper } from './converter.helper';

export interface ExceptionInterface {
  name: string;
  message: string;
  status: HttpStatus;
  code: ExceptionCodeEnum;
  type: ExceptionTypeEnum;
  stack?: string;
}

export enum ExceptionCodeEnum {
  // GRAPHQL_PARSE_FAILED = 'GRAPHQL_PARSE_FAILED',
  // GRAPHQL_VALIDATION_FAILED = 'GRAPHQL_VALIDATION_FAILED',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNKNOWN = 'UNKNOWN',
}

export enum ExceptionTypeEnum {
  HTTP_EXCEPTION = 'HttpException',
  APOLLO_ERROR = 'ApolloError',
  MONGO_ERROR = 'MongoError',
  ERROR_CLASS = 'ErrorClass',
  ERROR = 'Error',
  UNKNOWN = 'Unknown',
}

class ExceptionHelperClass {
  public castToException(payload: unknown): ExceptionInterface {
    let result: ExceptionInterface;
    if (payload instanceof HttpException) {
      result = this.castHttpException(payload);
    } else if (payload instanceof ApolloError) {
      result = this.castApolloError(payload);
    } else if (payload instanceof mongoose.mongo.MongoError) {
      result = this.castMongoError(payload);
    } else if (payload instanceof ErrorClass) {
      result = this.castErrorClass(payload);
    } else if (payload instanceof Error) {
      result = this.castError(payload);
    } else {
      result = this.castUnknown(payload);
    }
    return result;
  }

  private castHttpException(exception: HttpException): ExceptionInterface {
    return {
      name: exception.name,
      message: exception.message,
      status: exception.getStatus(),
      code: this.codeFromHttpStatus(exception.getStatus()),
      type: ExceptionTypeEnum.HTTP_EXCEPTION,
      stack: exception.stack,
    };
  }

  private castApolloError(error: ApolloError): ExceptionInterface {
    const extensions = error.extensions as {
      http?: { status?: number };
      code?: ExceptionCodeEnum;
    };
    return {
      name: error.name,
      message: error.message,
      status: extensions?.http?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      code: extensions?.code || ExceptionCodeEnum.INTERNAL_SERVER_ERROR,
      type: ExceptionTypeEnum.APOLLO_ERROR,
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
      type: ExceptionTypeEnum.MONGO_ERROR,
      stack: error.stack,
    };
  }

  private castErrorClass(error: ErrorClass): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: this.codeFromHttpStatus(error.status),
      type: ExceptionTypeEnum.ERROR_CLASS,
      stack: error.stack,
    };
  }

  private castError(error: Error): ExceptionInterface {
    return {
      name: error.name,
      message: error.message,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ExceptionTypeEnum.ERROR,
      stack: error.stack,
    };
  }

  private castUnknown(error: unknown): ExceptionInterface {
    return {
      name: ExceptionHelperClass.name,
      message: typeof error === 'object' ? ConverterHelper.toJson(error) : '',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.codeFromHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ExceptionTypeEnum.UNKNOWN,
      stack: new Error().stack,
    };
  }

  private codeFromHttpStatus(status?: HttpStatus): ExceptionCodeEnum {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ExceptionCodeEnum.BAD_USER_INPUT;
      case HttpStatus.FORBIDDEN:
        return ExceptionCodeEnum.FORBIDDEN;
      case HttpStatus.UNAUTHORIZED:
        return ExceptionCodeEnum.UNAUTHENTICATED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ExceptionCodeEnum.INTERNAL_SERVER_ERROR;
      default:
        return ExceptionCodeEnum.UNKNOWN;
    }
  }
}

export const ExceptionHelper = new ExceptionHelperClass();
