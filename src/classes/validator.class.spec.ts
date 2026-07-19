import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

import { ValidatorClass } from './validator.class';

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
      { property: 'child.name', value: 10, constraints: [{ isString: 'name must be a string' }] },
    ];

    expect(validator.validate(value)).toStrictEqual(expected);
    await expect(validator.validateAsync(value)).resolves.toStrictEqual(expected);
  });

  it('should throw ErrorClass for invalid values', async () => {
    const validator = new ValidatorClass();
    const value = invalid();

    expect(() => validator.validateOrThrow(value)).toThrow();
    await expect(validator.validateOrThrowAsync(value)).rejects.toMatchObject({
      name: 'Parent',
      messageIsJson: false,
    });
  });
});
