import 'reflect-metadata';
import { DecoratorClass, MethodCallbackMetadataInterface, ParameterCallbackMetadataInterface } from './decorator.class';

describe('DecoratorClass', () => {
  const decorator = new DecoratorClass('test-symbol');
  const symbol = (decorator as unknown as { symbol: symbol }).symbol;

  describe('DecoratorClass metadata', () => {
    it('should attach class metadata', () => {
      const data = { foo: 'lorem' };
      @decorator.decorateClass({ data })
      class TestClass {}
      const metadata = Reflect.getOwnMetadata(symbol, TestClass) as { data?: unknown };
      expect(metadata).toBeDefined();
      expect(metadata.data).toEqual(data);
    });
    // === METHOD METADATA TEST ===
    it('should attach method metadata', () => {
      const data = { foo: 'lorem' };
      class TestClass {
        @decorator.decorateMethod({ data })
        public method(value: number): number {
          return value;
        }
      }
      const metadata = Reflect.getOwnMetadata(symbol, TestClass, 'method') as { data?: unknown };
      expect(metadata).toBeDefined();
      expect(metadata.data).toEqual(data);
    });
    // === PARAMETER METADATA TEST ===
    it('should attach parameter metadata', () => {
      const data = {
        foo: 'lorem',
        bar: 12345,
      };
      class TestClass {
        @decorator.decorateMethod()
        public method(
          @decorator.decorateParameter({ data: data.foo }) value1: number,
          @decorator.decorateParameter({ data: data.bar }) value2: number,
        ): number {
          return value1 + value2;
        }
      }
      const metadata = Reflect.getOwnMetadata(symbol, TestClass.prototype, 'method') as Map<
        number,
        { name: string; data: unknown }[]
      >;
      expect(metadata).toBeDefined();
      const foo = metadata.get(0);
      expect(foo).toBeDefined();
      if (foo && foo[0]) {
        expect(foo[0].data).toEqual(data.foo);
      }
      const bar = metadata.get(1);
      expect(bar).toBeDefined();
      if (bar && bar[0]) {
        expect(bar[0].data).toEqual(data.bar);
      }
    });
  });

  describe('DecoratorClass callback', () => {
    it('should attach method decorator and call method callback', (): void => {
      const callOrder: number[] = [];
      const methodBeforeCallback = jest.fn((meta: MethodCallbackMetadataInterface, ...args: unknown[]) => {
        callOrder.push(1);
        return args.map((value) => (value as number) + 5);
      });
      const methodAfterCallback = jest.fn((meta: MethodCallbackMetadataInterface, result: unknown) => {
        callOrder.push(2);
        return (result as number) * 5;
      });
      class TestClass {
        @decorator.decorateMethod({ methodBeforeCallback, methodAfterCallback })
        public method(value1: number, value2: number): number {
          return value1 - value2;
        }
      }
      const instance = new TestClass();
      const result = instance.method(1, 2);
      // methodBeforeCallback 1 + 5 = 6, 2 + 5 = 7
      // methodAfterCallback 6 * 5 = 30, 7 * 5 = 35
      // method returns 30 - 35 = -5
      expect(methodBeforeCallback).toHaveBeenCalledTimes(1);
      expect(methodAfterCallback).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual([1, 2]);
      expect(result).toBe(-5);
    });
    it('should attach parameter decorator and call parameter callback', () => {
      const callOrder: number[] = [];
      const callback1 = jest.fn((meta: ParameterCallbackMetadataInterface, value: unknown) => {
        callOrder.push(1);
        return (value as number) + 10;
      });
      const callback2 = jest.fn((meta: ParameterCallbackMetadataInterface, value: unknown) => {
        callOrder.push(2);
        return (value as number) * 10;
      });
      class TestClass {
        @decorator.decorateMethod()
        public method(
          @decorator.decorateParameter({ parameterBeforeCallback: callback1 }) value1: number,
          @decorator.decorateParameter({ parameterBeforeCallback: callback2 }) value2: number,
        ): number {
          return value1 - value2;
        }
      }
      const instance = new TestClass();
      const result = instance.method(1, 2);
      // callback1 1 + 10 = 11
      // callback2 2 * 10 = 20
      // method 11 - 20 = -9
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual([1, 2]);
      expect(result).toBe(-9);
    });
    it('should attach method + parameter decorators and call method + parameter callbacks', () => {
      const callOrder: number[] = [];
      const methodBeforeCallback = jest.fn((meta: MethodCallbackMetadataInterface, ...args: unknown[]): unknown[] => {
        callOrder.push(1);
        return args.map((item) => (item as number) + 5);
      });
      const callback1 = jest.fn((meta: ParameterCallbackMetadataInterface, value: unknown) => {
        callOrder.push(2);
        return (value as number) + 10;
      });
      const callback2 = jest.fn((meta: ParameterCallbackMetadataInterface, value: unknown) => {
        callOrder.push(3);
        return (value as number) * 10;
      });
      const methodAfterCallback = jest.fn((meta: MethodCallbackMetadataInterface, res: unknown) => {
        callOrder.push(4);
        return (res as number) * 5;
      });
      class TestClass {
        @decorator.decorateMethod({ methodBeforeCallback, methodAfterCallback })
        public method(
          @decorator.decorateParameter({ parameterBeforeCallback: callback1 }) value1: number,
          @decorator.decorateParameter({ parameterBeforeCallback: callback2 }) value2: number,
        ): number {
          return value1 - value2;
        }
      }
      const instance = new TestClass();
      const result = instance.method(1, 2);
      // methodBeforeCallback 1 + 5 = 6, 2 + 5 = 7
      // callback1 6 + 10 = 16
      // callback2 7 * 10 = 70
      // method 16 - 70 = 54
      // methodAfterCallback -54 * 5 = -270
      expect(methodBeforeCallback).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(methodAfterCallback).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual([1, 2, 3, 4]);
      expect(result).toBe(-270);
    });
  });

  describe('DecoratorClass getter and setter', () => {
    it('should correctly handle getter with before/after callbacks', () => {
      const callOrder: number[] = [];
      const methodBeforeCallback = jest.fn((meta: MethodCallbackMetadataInterface, ...args: unknown[]) => {
        callOrder.push(1);
        return args.map((value) => (value as number) + 5);
      });
      const methodAfterCallback = jest.fn((meta: MethodCallbackMetadataInterface, result: unknown) => {
        callOrder.push(2);
        return (result as number) * 5;
      });
      class TestClass {
        private readonly _value = 10;
        @decorator.decorateMethod({ methodBeforeCallback, methodAfterCallback })
        public get value(): number {
          return this._value;
        }
      }
      const instance = new TestClass();
      const result = instance.value;
      // get: 10 → afterResultCallback: 10 * 5 = 50
      expect(methodBeforeCallback).not.toHaveBeenCalled();
      expect(methodAfterCallback).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual([2]);
      expect(result).toBe(50);
    });
    it('should correctly handle setter with before/after callbacks', () => {
      const callOrder: number[] = [];
      const methodBeforeCallback = jest.fn((meta: MethodCallbackMetadataInterface, ...args: unknown[]) => {
        callOrder.push(1);
        return args.map((value) => (value as number) + 5);
      });
      const methodAfterCallback = jest.fn((meta: MethodCallbackMetadataInterface, result: unknown) => {
        callOrder.push(2);
        return (result as number) * 5;
      });
      class TestClass {
        private _value = 0;
        public get value(): number {
          return this._value;
        }
        @decorator.decorateMethod({ methodBeforeCallback, methodAfterCallback })
        public set value(v: number) {
          this._value = v;
        }
      }
      const instance = new TestClass();
      instance.value = 10;
      // set: 10 → methodBeforeCallback: 10 + 5 = 15
      expect(methodBeforeCallback).toHaveBeenCalledTimes(1);
      expect(methodAfterCallback).not.toHaveBeenCalled(); // для SET after не должен вызываться
      expect(callOrder).toEqual([1]);
      expect(instance.value).toBe(15);
    });
  });
});
