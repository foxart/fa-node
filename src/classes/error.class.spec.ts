import { HttpStatus } from '@nestjs/common';

import { ErrorClass } from './error.class';

describe('ErrorClass', () => {
  it('should preserve primitive messages and defaults', () => {
    const error = new ErrorClass({ message: 'failure' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ErrorClass');
    expect(error.message).toBe('failure');
    expect(error.messageIsJson).toBe(true);
    expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should serialize structured messages and preserve explicit fields', () => {
    const error = new ErrorClass({
      name: 'ValidationError',
      message: { field: 'invalid' },
      stack: 'custom stack',
      status: HttpStatus.BAD_REQUEST,
    });

    expect(error.name).toBe('ValidationError');
    expect(JSON.parse(error.message)).toStrictEqual({ field: 'invalid' });
    expect(error.messageIsJson).toBe(false);
    expect(error.stack).toBe('custom stack');
    expect(error.status).toBe(HttpStatus.BAD_REQUEST);
  });
});
