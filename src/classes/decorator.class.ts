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
  methodBeforeCallback?: MethodBeforeCallType;
  methodAfterCallback?: MethodAfterCallType;
}
interface ParameterDecoratorInterface {
  data?: unknown;
  parameterBeforeCallback?: ParameterCallbackType;
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
  beforeCall?: MethodBeforeCallType;
  afterCall?: MethodAfterCallType;
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

type MethodBeforeCallType = (metadata: MethodCallbackMetadataInterface, ...parameters: unknown[]) => unknown[];
type MethodAfterCallType = (
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
    target: object,
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
    target: object,
    propertyKey: string | symbol,
    context: unknown,
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
            methodMetadata?.beforeCall && methodMetadata?.accessor !== 'GET'
              ? methodMetadata.beforeCall(methodCallbackMetadata, ...args)
              : args;
          const result = await method.apply(
            context,
            DecoratorClass.handleParameters(symbol, target, propertyKey, beforeArgs),
          );
          return methodMetadata?.afterCall && methodMetadata?.accessor !== 'SET'
            ? methodMetadata.afterCall(methodCallbackMetadata, result)
            : result;
        }
      : (...args: unknown[]): unknown => {
          const beforeArgs =
            methodMetadata?.beforeCall && methodMetadata?.accessor !== 'GET'
              ? methodMetadata.beforeCall(methodCallbackMetadata, ...args)
              : args;
          const result = method.apply(
            context,
            DecoratorClass.handleParameters(symbol, target, propertyKey, beforeArgs),
          );
          return methodMetadata?.afterCall && methodMetadata?.accessor !== 'SET'
            ? methodMetadata.afterCall(methodCallbackMetadata, result)
            : result;
        };
  }

  // + перенести все reflect-метаданные со старой функции на новую
  private static copyFunctionMetadata(fromFn: FunctionType, toFn: FunctionType): void {
    if (typeof Reflect?.getMetadataKeys !== 'function') {
      return;
    }
    const keys = Reflect.getMetadataKeys(fromFn) as (string | symbol)[];
    for (const k of keys) {
      const v = Reflect.getMetadata(k, fromFn) as unknown;
      Reflect.defineMetadata(k, v, toFn);
    }
    for (const k of ['design:type', 'design:paramtypes', 'design:returntype'] as const) {
      try {
        const v = Reflect.getMetadata?.(k, fromFn) as unknown;
        if (v !== undefined) {
          Reflect.defineMetadata?.(k, v, toFn);
        }
      } catch {
        // ignore
      }
    }
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
    return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const symbol = this.symbol;
      const designMetadata = DecoratorClass.getDesignMetadata(target, propertyKey); // <-- читаем design метаданные
      const methodMetadata: MethodMetadataInterface = {
        accessor: descriptor.set ? 'SET' : descriptor.get ? 'GET' : 'VAL',
        // name: designMetadata.returntype.name,
        type: designMetadata?.returntype,
        data: data?.data,
        beforeCall: data?.methodBeforeCallback,
        afterCall: data?.methodAfterCallback,
      };
      DecoratorClass.setMethodMetadata(symbol, target, propertyKey, methodMetadata);

      if (descriptor.value) {
        const originalFn = descriptor.value as FunctionType;
        const wrapped: FunctionType = function (this: unknown, ...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, originalFn)(...args);
        };

        // КРИТИЧЕСКОЕ: копируем все метаданные со старой функции на новую
        DecoratorClass.copyFunctionMetadata(originalFn, wrapped);

        descriptor.value = wrapped;

        // УБРАНО: сломанный блок “копирования” собственных свойств функции
        // Object.getOwnPropertyNames(originalFn).forEach((property) => {
        //   Object.defineProperty(descriptor.value, property, {
        //     value: propertyKey,
        //   });
        // });
      }
      if (descriptor.get) {
        const originalGet = (descriptor as { get: FunctionType }).get;
        const wrappedGet: FunctionType = function (this: unknown, ...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, originalGet)(...args);
        };
        DecoratorClass.copyFunctionMetadata(originalGet, wrappedGet);
        descriptor.get = wrappedGet;
      }
      if (descriptor.set) {
        const originalSet = (descriptor as { set: FunctionType }).set;
        const wrappedSet: FunctionType = function (this: unknown, ...args: unknown[]): unknown {
          return DecoratorClass.rewriteDescriptor(symbol, target, propertyKey, this, originalSet)(...args);
        };
        DecoratorClass.copyFunctionMetadata(originalSet, wrappedSet);
        descriptor.set = wrappedSet;
      }
      return descriptor;
    };
  }

  public decorateParameter(data?: ParameterDecoratorInterface): ParameterDecorator {
    return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
      if (propertyKey === undefined) {
        return;
      }
      const designMetadata = DecoratorClass.getDesignMetadata(target, propertyKey);
      const parameterMetadata: ParameterMetadataInterface = data
        ? {
            name: designMetadata.paramtypes[parameterIndex].name,
            type: designMetadata.paramtypes[parameterIndex],
            data: data.data,
            callback: data.parameterBeforeCallback,
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
