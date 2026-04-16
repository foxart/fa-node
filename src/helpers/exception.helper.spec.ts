import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorClass } from '../classes/error.class';
import { ExceptionCodeEnum, ExceptionHelper, ExceptionTypeEnum } from './exception.helper';

describe('ExceptionHelper', () => {
  it('should cast HttpException', () => {
    const error = new HttpException('denied', HttpStatus.FORBIDDEN);

    expect(ExceptionHelper.castToException(error)).toMatchObject({
      name: 'HttpException',
      message: 'denied',
      status: HttpStatus.FORBIDDEN,
      code: ExceptionCodeEnum.FORBIDDEN,
      type: ExceptionTypeEnum.HTTP_EXCEPTION,
    });
  });

  it('should cast Apollo-like errors without apollo-server-errors import', () => {
    const error = Object.assign(new Error('bad input'), {
      name: 'ApolloError' as const,
      extensions: {
        http: { status: HttpStatus.BAD_REQUEST },
        code: ExceptionCodeEnum.BAD_USER_INPUT,
      },
    });

    expect(ExceptionHelper.castToException(error)).toMatchObject({
      name: 'ApolloError',
      message: 'bad input',
      status: HttpStatus.BAD_REQUEST,
      code: ExceptionCodeEnum.BAD_USER_INPUT,
      type: ExceptionTypeEnum.APOLLO_ERROR,
    });
  });

  it('should cast Mongo-like duplicate key errors without mongoose import', () => {
    const error = Object.assign(
      new Error(
        'E11000 duplicate key error collection: db.users index: email_1 dup key: { email: "test@example.com" }',
      ),
      {
        name: 'MongoServerError' as const,
        code: 11000,
      },
    );

    expect(ExceptionHelper.castToException(error)).toMatchObject({
      name: 'MongoServerError',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ExceptionCodeEnum.INTERNAL_SERVER_ERROR,
      type: ExceptionTypeEnum.MONGO_ERROR,
    });
  });

  it('should cast ErrorClass', () => {
    const error = new ErrorClass({
      name: 'CustomError',
      message: 'boom',
      status: HttpStatus.BAD_REQUEST,
    });

    expect(ExceptionHelper.castToException(error)).toMatchObject({
      name: 'CustomError',
      message: 'boom',
      status: HttpStatus.BAD_REQUEST,
      code: ExceptionCodeEnum.BAD_USER_INPUT,
      type: ExceptionTypeEnum.ERROR_CLASS,
    });
  });

  it('should cast plain Error', () => {
    const error = new Error('boom');

    expect(ExceptionHelper.castToException(error)).toMatchObject({
      name: 'Error',
      message: 'boom',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ExceptionCodeEnum.INTERNAL_SERVER_ERROR,
      type: ExceptionTypeEnum.ERROR,
    });
  });
});
