import 'reflect-metadata';

type FunctionType = (...args: unknown[]) => unknown;
type ConstructableType = new (...args: unknown[]) => unknown;

interface DesignMetadataInterface {
  type: ConstructableType;
  paramtypes: ConstructableType[];
  returntype: ConstructableType;
}

/**
 * DECORATOR
 */
interface ClassDecoratorInterface {
  data?: unknown;
}
interface MethodDecoratorInterface {
  data?: unknown;
  beforeParameterCallback?: MethodBeforeParameterCallbackType;
  afterResultCallback?: MethodAfterResultCallbackType;
}
interface ParameterDecoratorInterface {
  data?: unknown;
  callback?: ParameterCallbackType;
}

/**
 * METADATA
 */
interface ClassMetadataInterface {
  data?: unknown;
}
interface MethodMetadataInterface {
  accessor: 'GET' | 'SET' | 'VAL';
  type: ConstructableType;
  data?: unknown;
  beforeParameterCallback?: MethodBeforeParameterCallbackType;
  afterResultCallback?: MethodAfterResultCallbackType;
}
interface ParameterMetadataInterface {
  name: string;
  type: ConstructableType;
  data?: unknown;
  callback?: ParameterCallbackType;
}

/**
 *
 */
export interface MethodCallbackMetadataInterface {
  className: string;
  classData?: unknown;
  methodName: string;
  methodType?: ConstructableType;
  methodData?: unknown;
}

type MethodBeforeParameterCallbackType = (
  metadata: MethodCallbackMetadataInterface,
  ...parameters: unknown[]
) => unknown[];
type MethodAfterResultCallbackType = (
  metadata: MethodCallbackMetadataInterface,
  result: unknown | unknown[],
) => unknown | unknown[];

export interface ParameterCallbackMetadataInterface extends MethodCallbackMetadataInterface {
  parameterIndex: number;
  parameterName: string;
  parameterType?: ConstructableType;
  parameterData?: unknown;
}

type ParameterCallbackType = (metadata: ParameterCallbackMetadataInterface, value: unknown) => unknown;

type ParameterMetadataMapType = Map<number, ParameterMetadataInterface[]>;

export class DecoratorClass {
  private static readonly DESIGN_TYPE = 'design:type';
  private static readonly DESIGN_PARAMETER_TYPE_LIST = 'design:paramtypes';
  private static readonly DESIGN_RETURN_TYPE = 'design:returntype';
  private readonly symbol: symbol;

  public constructor(symbol: string) {
    this.symbol = Symbol(symbol);
  }

  private static getClassMetadata(symbol: symbol, target: object): ClassMetadataInterface | undefined {
    return Reflect.getOwnMetadata(symbol, target.constructor) as ClassMetadataInterface;
  }

  private static setClassMetadata(symbol: symbol, target: object, metadata: ClassMetadataInterface): void {
    Reflect.defineMetadata(symbol, metadata, target);
  }

  private static getMethodMetadata(
    symbol: symbol,
    target: object,
    propertyKey: string | symbol,
  ): MethodMetadataInterface | undefined {
    return Reflect.getOwnMetadata(symbol, target.constructor, propertyKey) as MethodMetadataInterface;
  }

  private static setMethodMetadata(
    symbol: symbol,
    target: object,
    propertyKey: string | symbol,
    metadata: MethodMetadataInterface,
  ): void {
    Reflect.defineMetadata(symbol, metadata, target.constructor, propertyKey);
  }

  private static getParameterMetadata(
    symbol: symbol,
    target: object,
    propertyKey: string | symbol,
  ): ParameterMetadataMapType {
    return (Reflect.getOwnMetadata(symbol, target, propertyKey) || new Map()) as ParameterMetadataMapType;
  }

  private static setParameterMetadata(
    symbol: symbol,
    target: object,
    propertyKey: string | symbol,
    metadata: ParameterMetadataMapType,
  ): void {
    Reflect.defineMetadata(symbol, metadata, target, propertyKey);
  }

  /** PRIVATE */
  private static getDesignMetadata(target: object, propertyKey: string | symbol): DesignMetadataInterface {
    return {
      type: Reflect.getOwnMetadata(DecoratorClass.DESIGN_TYPE, target, propertyKey) as ConstructableType,
      paramtypes: Reflect.getOwnMetadata(
        DecoratorClass.DESIGN_PARAMETER_TYPE_LIST,
        target,
        propertyKey,
      ) as ConstructableType[],
      returntype: Reflect.getOwnMetadata(DecoratorClass.DESIGN_RETURN_TYPE, target, propertyKey) as ConstructableType,
    };
  }

  private static handleParameters(
    symbol: symbol,
    target: ConstructableType,
    propertyKey: string | symbol,
    args: unknown[],
  ): unknown[] {
    const classMetadata = DecoratorClass.getClassMetadata(symbol, target);
    const methodMetadata = DecoratorClass.getMethodMetadata(symbol, target, propertyKey);
    const parameterMetadata = DecoratorClass.getParameterMetadata(symbol, target, propertyKey);
    return args.map((value, index) => {
      return parameterMetadata.has(index)
        ? (parameterMetadata.get(index) as ParameterMetadataInterface[]).reduce(
            (acc, { name, type, callback, data }) => {
              return callback
                ? callback(
                    {
                      className: target.constructor.name,
                      classData: classMetadata?.data,
                      methodName: propertyKey.toString(),
                      methodType: methodMetadata?.type,
                      methodData: methodMetadata?.data,
                      parameterIndex: index,
                      parameterName: name,
                      parameterType: type,
                      parameterData: data,
                    },
                    acc,
                  )
                : acc;
            },
            value,
          )
        : value;
    });
  }

  private static rewriteDescriptor(
    symbol: symbol,
    target: ConstructableType,
    propertyKey: string | symbol,
    context: PropertyDescriptor,
    method: FunctionType,
  ): (...args: unknown[]) => unknown | Promise<unknown> {
    const classMetadata = DecoratorClass.getClassMetadata(symbol, target);
    const methodMetadata = DecoratorClass.getMethodMetadata(symbol, target, propertyKey);
    const methodCallbackMetadata: MethodCallbackMetadataInterface = {
      className: target.constructor.name,
      classData: classMetadata?.data,
      methodName: method.name,
      methodType: methodMetadata?.type,
      methodData: methodMetadata?.data,
    };
    const isReturnTypePromise = methodMetadata?.type === Promise;
    return isReturnTypePromise
      ? async (...args: unknown[]): Promise<unknown> => {
          const beforeArgs =
            methodMetadata?.beforeParameterCallback && methodMetadata?.accessor !== 'GET'
              ? methodMetadata.beforeParameterCallback(methodCallbackMetadata, ...args)
              : args;
          const result = await method.apply(
            context,
            DecoratorClass.handleParameters(symbol, target, propertyKey, beforeArgs),
          );
          return methodMetadata?.afterResultCallback && methodMetadata?.accessor !== 'SET'
            ? methodMetadata.afterResultCallback(methodCallbackMetadata, result)
            : result;
        }
      : (...args: unknown[]): unknown => {
          const beforeArgs =
            methodMetadata?.beforeParameterCallback && methodMetadata?.accessor !== 'GET'
              ? methodMetadata.beforeParameterCallback(methodCallbackMetadata, ...args)
              : args;
          const result = method.apply(
            context,
            DecoratorClass.handleParameters(symbol, target, propertyKey, beforeArgs),
          );
          return methodMetadata?.afterResultCallback && methodMetadata?.accessor !== 'SET'
            ? methodMetadata.afterResultCallback(methodCallbackMetadata, result)
            : result;
        };
  }

  /** PUBLIC */
  public decorateClass(data?: ClassDecoratorInterface): ClassDecorator {
    return <T>(target: object): T | void => {
      const classMetadata: ClassMetadataInterface = {
        data: data?.data,
      };
      DecoratorClass.setClassMetadata(this.symbol, target, classMetadata);
    };
  }

  public decorateMethod(data?: MethodDecoratorInterface): MethodDecorator {
    return (
      target: ConstructableType,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      const symbol = this.symbol;
      const designMetadata = DecoratorClass.getDesignMetadata(target, propertyKey); // <-- читаем design метаданные
      const methodMetadata: MethodMetadataInterface = {
        accessor: descriptor.value ? 'VAL' : descriptor.get ? 'GET' : 'SET',
        // name: designMetadata.returntype.name,
        type: designMetadata?.returntype,
        data: data?.data,
        beforeParameterCallback: data?.beforeParameterCallback,
        afterResultCallback: data?.afterResultCallback,
      };
      DecoratorClass.setMethodMetadata(symbol, target, propertyKey, methodMetadata);
      if (descriptor.value) {
        const descriptorValue = descriptor.value as FunctionType;
        descriptor.value = function (...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, descriptorValue)(...args);
        };
        Object.getOwnPropertyNames(descriptorValue).forEach((property) => {
          Object.defineProperty(descriptor.value, property, {
            value: propertyKey,
          });
        });
      }
      if (descriptor.get) {
        const descriptorGet = (descriptor as { get: FunctionType }).get;
        descriptor.get = function (...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, descriptorGet)(...args);
        };
      }
      if (descriptor.set) {
        const descriptorSet = (descriptor as { set: FunctionType }).set;
        descriptor.set = function (...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, descriptorSet)(...args);
        };
      }
      return descriptor;
    };
  }

  public decorateParameter(data?: ParameterDecoratorInterface): ParameterDecorator {
    return <T>(target: ConstructableType, propertyKey: string | symbol, parameterIndex: number): T | void => {
      const designMetadata = DecoratorClass.getDesignMetadata(target, propertyKey);
      const parameterMetadata: ParameterMetadataInterface = data
        ? {
            name: designMetadata.paramtypes[parameterIndex].name,
            type: designMetadata.paramtypes[parameterIndex],
            data: data.data,
            callback: data.callback,
          }
        : {
            name: designMetadata.paramtypes[parameterIndex].name,
            type: designMetadata.paramtypes[parameterIndex],
          };
      const parameterMetadataMap = DecoratorClass.getParameterMetadata(this.symbol, target, propertyKey);
      if (parameterMetadataMap.has(parameterIndex)) {
        parameterMetadataMap.set(parameterIndex, [
          parameterMetadata,
          ...(parameterMetadataMap.get(parameterIndex) as ParameterMetadataInterface[]),
        ]);
      } else {
        parameterMetadataMap.set(parameterIndex, [parameterMetadata]);
      }
      DecoratorClass.setParameterMetadata(this.symbol, target, propertyKey, parameterMetadataMap);
    };
  }
}
