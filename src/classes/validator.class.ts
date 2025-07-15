import { ClassConstructor } from 'class-transformer';
import { validate, validateSync, ValidationError, ValidatorOptions } from 'class-validator';
import { DataHelper } from '../helpers/data.helper';
import { ErrorClass } from './error.class';

interface ErrorInterface {
  property?: string;
  value?: unknown;
  constraints?: Record<string, string>[];
}

export class ValidatorClass {
  public constructor(private readonly config: ValidatorOptions = {}) {}

  public getConfig(): ValidatorOptions {
    return this.config;
  }

  public async errorsAsync<I>(instance: I): Promise<ErrorInterface[] | null> {
    return this.getError(await validate(instance as object, this.config));
  }

  public errorsSync<I>(instance: I): ErrorInterface[] | null {
    return this.getError(validateSync(instance as object, this.config));
  }

  public async validateAsync<I>(instance: I): Promise<I> {
    const errors = this.getError(await validate(instance as object, this.config));
    if (errors) {
      this.throwErrors(instance, errors);
    }
    return instance;
  }

  public validateSync<T>(instance: T): T {
    const errors = this.getError(validateSync(instance as object, this.config));
    if (errors) {
      this.throwErrors(instance, errors);
    }
    return instance;
  }

  public toValidateType(type: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !types.includes(type);
  }

  public toValidateValue(value: unknown, instances?: unknown[]): boolean {
    // !(instances || []).some((instance) => {
    //   return typeof instance === 'function' && value instanceof instance;
    // });
    return (
      DataHelper.isInstanceObject(value) &&
      !Buffer.isBuffer(value) &&
      !(instances || []).some((instance) => {
        return value instanceof (instance as ClassConstructor<unknown>);
      })
    );
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
          constraints: mapConstraints(error.constraints as Record<string, string>),
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
