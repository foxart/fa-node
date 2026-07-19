import { HttpStatus } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

import { ErrorClass } from './error.class';
import { MiddlewareClass } from './middleware.class';
import { RouteClass } from './route.class';
import { TransformerClass } from './transformer.class';
import { ValidatorClass } from './validator.class';

describe('core classes', () => {
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

  describe('MiddlewareClass', () => {
    it('should execute middleware in order and forward the transformed payload', () => {
      const middleware = new MiddlewareClass<number>();
      const next = jest.fn();
      middleware.add((value, proceed) => proceed(value + 1));
      middleware.add((value, proceed) => proceed(value * 2));

      middleware.use(2, next);

      expect(next).toHaveBeenCalledWith(6);
    });

    it('should call next immediately when no middleware exists', () => {
      const next = jest.fn();

      new MiddlewareClass<string>().use('value', next);

      expect(next).toHaveBeenCalledWith('value');
    });

    it('should reject an invalid recursive position', () => {
      const middleware = new MiddlewareClass<number>();
      const executor = (
        middleware as unknown as {
          executor: (payload: number, next: (payload: number) => void, current: number, previous: number) => void;
        }
      ).executor.bind(middleware);

      expect(() => executor(1, jest.fn(), 0, 1)).toThrow('multiple calls');
    });
  });

  describe('RouteClass', () => {
    class Route extends RouteClass {}

    it('should expose a route without a prefix', () => {
      const route = new Route({ path: 'health' });

      expect(route.getPrefix()).toBe('');
      expect(route.getPath()).toBe('health');
      expect(route.getRoute()).toBe('/health');
    });

    it('should expose a prefixed route', () => {
      const route = new Route({ path: 'users', prefix: 'api' });

      expect(route.getPrefix()).toBe('api');
      expect(route.getRoute()).toBe('/api/users');
    });
  });

  describe('TransformerClass', () => {
    class Model {
      public value = '';
    }

    it('should expose options and transform in both directions', () => {
      const options = { exposeDefaultValues: true };
      const transformer = new TransformerClass(options);
      const instance = transformer.plainToInstance({ value: 'test' }, Model);

      expect(transformer.options).toBe(options);
      expect(instance).toBeInstanceOf(Model);
      expect(instance.value).toBe('test');
      expect(transformer.instanceToPlain(instance)).toStrictEqual({ value: 'test' });
    });
  });

  describe('ValidatorClass', () => {
    class Child {
      @IsString()
      public name!: string;
    }

    class Parent {
      @ValidateNested()
      @Type(() => Child)
      public child!: Child;
    }

    const valid = (): Parent => {
      const child = new Child();
      child.name = 'valid';
      const parent = new Parent();
      parent.child = child;
      return parent;
    };

    const invalid = (): Parent => {
      const child = new Child();
      child.name = 10 as unknown as string;
      const parent = new Parent();
      parent.child = child;
      return parent;
    };

    it('should expose options and return null for valid values', async () => {
      const options = { forbidUnknownValues: false };
      const validator = new ValidatorClass(options);
      const value = valid();

      expect(validator.options).toBe(options);
      expect(validator.validate(value)).toBeNull();
      await expect(validator.validateAsync(value)).resolves.toBeNull();
      expect(validator.validateOrThrow(value)).toBe(value);
      await expect(validator.validateOrThrowAsync(value)).resolves.toBe(value);
    });

    it('should flatten nested validation errors', async () => {
      const validator = new ValidatorClass();
      const value = invalid();
      const expected = [
        {
          property: 'child.name',
          value: 10,
          constraints: [{ isString: 'name must be a string' }],
        },
      ];

      expect(validator.validate(value)).toStrictEqual(expected);
      await expect(validator.validateAsync(value)).resolves.toStrictEqual(expected);
    });

    it('should throw ErrorClass for invalid values', async () => {
      const validator = new ValidatorClass();
      const value = invalid();

      expect(() => validator.validateOrThrow(value)).toThrow(ErrorClass);
      await expect(validator.validateOrThrowAsync(value)).rejects.toMatchObject({
        name: 'Parent',
        messageIsJson: false,
      });
    });
  });
});
