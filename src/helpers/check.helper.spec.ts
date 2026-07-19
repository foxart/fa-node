import { CheckHelper } from './check.helper';

describe('CheckHelper', () => {
  it('should identify arrays and empty arrays', () => {
    expect(CheckHelper.isArray([])).toBe(true);
    expect(CheckHelper.isArray({})).toBe(false);
    expect(CheckHelper.isArrayEmpty([])).toBe(true);
    expect(CheckHelper.isArrayEmpty([1])).toBe(false);
    expect(CheckHelper.isArrayEmpty({})).toBe(false);
  });

  it('should identify buffers with and without a global Buffer constructor', () => {
    expect(CheckHelper.isBuffer(Buffer.from('value'))).toBe(true);
    expect(CheckHelper.isBuffer('value')).toBe(false);

    const buffer = globalThis.Buffer;
    try {
      (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer = undefined;
      expect(CheckHelper.isBuffer('value')).toBe(false);
    } finally {
      (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = buffer;
    }
  });

  it('should honor each empty-value option', () => {
    expect(CheckHelper.isEmpty(undefined, { undefined: true })).toBe(true);
    expect(CheckHelper.isEmpty(null, { null: true })).toBe(true);
    expect(CheckHelper.isEmpty('', { blankString: true })).toBe(true);
    expect(CheckHelper.isEmpty(0, { zeroNumber: true })).toBe(true);
    expect(CheckHelper.isEmpty({}, { emptyObject: true })).toBe(true);
    expect(CheckHelper.isEmpty([], { emptyArray: true })).toBe(true);
    expect(CheckHelper.isEmpty('value', { blankString: true })).toBe(false);
    expect(CheckHelper.isEmpty(undefined)).toBe(false);
  });

  it('should deeply compare arrays and objects', () => {
    expect(CheckHelper.isEqual(1, 1)).toBe(true);
    expect(CheckHelper.isEqual(1, '1')).toBe(false);
    expect(CheckHelper.isEqual([1, { value: true }], [1, { value: true }])).toBe(true);
    expect(CheckHelper.isEqual([1], [1, 2])).toBe(false);
    expect(CheckHelper.isEqual([1], [2])).toBe(false);
    expect(CheckHelper.isEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(CheckHelper.isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(CheckHelper.isEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(CheckHelper.isEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(CheckHelper.isEqual('a', 'b')).toBe(false);
  });

  it('should classify instances, mongo IDs, objects, and primitives', () => {
    class Value {}
    const mongoId = { toString: (): string => '0123456789abcdef01234567' };

    expect(CheckHelper.isInstance(new Value())).toBe(true);
    expect(CheckHelper.isInstance({})).toBe(false);
    expect(CheckHelper.isMongoId(mongoId)).toBe(true);
    expect(CheckHelper.isMongoId({ toString: (): string => 'invalid' })).toBe(false);
    expect(CheckHelper.isMongoId('0123456789abcdef01234567')).toBe(false);
    expect(CheckHelper.isNull(null)).toBe(true);
    expect(CheckHelper.isNull(undefined)).toBe(false);
    expect(CheckHelper.isObject({})).toBe(true);
    expect(CheckHelper.isObject([])).toBe(false);
    expect(CheckHelper.isObject(mongoId)).toBe(false);
    expect(CheckHelper.isObject(new Date())).toBe(false);
    expect(CheckHelper.isObject(/value/)).toBe(false);
    expect(CheckHelper.isObject(new Map())).toBe(false);
    expect(CheckHelper.isObject(new Set())).toBe(false);
    expect(CheckHelper.isObject(new WeakMap())).toBe(false);
    expect(CheckHelper.isObject(new WeakSet())).toBe(false);
    expect(CheckHelper.isObject(Buffer.from('value'))).toBe(false);
    expect(CheckHelper.isObject(new Uint8Array())).toBe(false);
    expect(CheckHelper.isObject(null)).toBe(false);
    expect(CheckHelper.isObjectEmpty({})).toBe(true);
    expect(CheckHelper.isObjectEmpty({ value: true })).toBe(false);
    expect(CheckHelper.isObjectEmpty([])).toBe(false);

    for (const value of [undefined, null, 'value', 1, true, Symbol('value'), 1n]) {
      expect(CheckHelper.isPrimitive(value)).toBe(true);
    }
    expect(CheckHelper.isPrimitive({})).toBe(false);
  });
});
