import { ClassConstructor } from 'class-transformer';
import { validate, validateSync, ValidationError, ValidatorOptions } from 'class-validator';
import { ErrorClass } from './error.class';

interface ErrorInterface {
  property?: string;
  value?: unknown;
  constraints?: Record<string, string>[];
}

export class ValidatorClass {
  public constructor(private readonly validatorOptions: ValidatorOptions = {}) {}

  public get options(): ValidatorOptions {
    return this.validatorOptions;
  }

  public async validateAsync<I>(instance: I): Promise<ErrorInterface[] | null> {
    return this.getError(await validate(instance as object, this.validatorOptions));
  }

  public validate<I>(instance: I): ErrorInterface[] | null {
    return this.getError(validateSync(instance as object, this.validatorOptions));
  }

  public async validateOrThrowAsync<I>(instance: I): Promise<I> {
    const errors = this.getError(await validate(instance as object, this.validatorOptions));
    if (errors) {
      this.throwErrors(instance, errors);
    }
    return instance;
  }

  public validateOrThrow<T>(instance: T): T {
    const errors = this.getError(validateSync(instance as object, this.validatorOptions));
    if (errors) {
      this.throwErrors(instance, errors);
    }
    return instance;
  }

  private getError(errorList: ValidationError[]): ErrorInterface[] | null {
    const result: ErrorInterface[] = [];
    const mapConstraints = (constraints: Record<string, string>): Array<Record<string, string>> => {
      return Object.entries(constraints).map(([key, value]) => ({
        [key]: value,
      }));
    };
    const processError = (error: ValidationError, propertyPath: string = ''): void => {
      const currentProperty = propertyPath ? `${propertyPath}.${error.property}` : error.property;
      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => {
          processError(child, currentProperty);
        });
      } else if (error.constraints) {
        result.push({
          property: currentProperty,
          value: error.value,
          constraints: mapConstraints(error.constraints),
        });
      }
    };
    errorList.forEach((error) => processError(error));
    return result.length ? result : null;
  }

  private throwErrors<T>(instance: T, errors: ErrorInterface[]): void {
    throw new ErrorClass({
      name: (instance as ClassConstructor<T>).constructor.name,
      message: errors,
    });
  }
}
