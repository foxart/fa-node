import { CheckHelper } from './check.helper';
import { DataHelper } from './data.helper';

describe('DataHelper', () => {
  describe('isEmpty / isObject / isArray', () => {
    it('should detect empty values correctly', () => {
      expect(CheckHelper.isEmpty(undefined, { undefined: true })).toBe(true);
      expect(CheckHelper.isEmpty(null, { null: true })).toBe(true);
      expect(CheckHelper.isEmpty('', { blankString: true })).toBe(true);
      expect(CheckHelper.isEmpty(0, { zeroNumber: true })).toBe(true);
      expect(CheckHelper.isEmpty([], { emptyArray: true })).toBe(true);
      expect(CheckHelper.isEmpty({}, { emptyObject: true })).toBe(true);
    });

    it('should detect non-empty values correctly', () => {
      expect(CheckHelper.isEmpty('x', { blankString: true })).toBe(false);
      expect(CheckHelper.isEmpty(1, { zeroNumber: true })).toBe(false);
      expect(CheckHelper.isEmpty([1], { emptyArray: true })).toBe(false);
      expect(CheckHelper.isEmpty({ a: 1 }, { emptyObject: true })).toBe(false);
    });

    it('should detect object types', () => {
      expect(CheckHelper.isObject({})).toBe(true);
      expect(CheckHelper.isObject([])).toBe(false);
      expect(CheckHelper.isObject(new Date())).toBe(false);
      expect(CheckHelper.isObject(/regex/)).toBe(false);
      expect(CheckHelper.isObject(Buffer.from('x'))).toBe(false);
    });
  });

  describe('omitEmpty / pickEmpty', () => {
    const object = {
      null: null,
      number: 123,
      numberEmpty: 0,
      string: 'string',
      stringEmpty: '',
      undefined: undefined,
      arrayEmpty: [],
      objectEmpty: {},
    };
    const objectRecursive = { ...object };
    const arrayRecursive = [{ ...object }];
    const data = {
      ...object,
      array: [object],
      object,
      arrayRecursive,
      objectRecursive,
    };

    it('should omit empty fields', () => {
      const result = DataHelper.omitEmpty(data, {
        emptyArray: true,
        emptyObject: true,
        blankString: true,
        null: true,
        undefined: true,
        zeroNumber: true,
      });
      expect(result).toStrictEqual({
        number: 123,
        string: 'string',
        array: [
          {
            number: 123,
            string: 'string',
          },
        ],
        object: {
          number: 123,
          string: 'string',
        },
        arrayRecursive: [
          {
            number: 123,
            string: 'string',
          },
        ],
        objectRecursive: {
          number: 123,
          string: 'string',
        },
      });
    });

    it('should pick only empty fields', () => {
      const result = DataHelper.pickEmpty(
        data,
        {
          emptyArray: true,
          emptyObject: true,
          blankString: true,
          null: true,
          undefined: true,
          zeroNumber: true,
        },
        true,
      );
      expect(result).toStrictEqual({
        null: null,
        numberEmpty: 0,
        stringEmpty: '',
        undefined: undefined,
        arrayEmpty: [],
        objectEmpty: {},
        array: [
          {
            null: null,
            numberEmpty: 0,
            stringEmpty: '',
            undefined: undefined,
            arrayEmpty: [],
            objectEmpty: {},
          },
        ],
        arrayRecursive: [
          {
            null: null,
            numberEmpty: 0,
            stringEmpty: '',
            undefined: undefined,
            arrayEmpty: [],
            objectEmpty: {},
          },
        ],
        object: {
          null: null,
          numberEmpty: 0,
          stringEmpty: '',
          undefined: undefined,
          arrayEmpty: [],
          objectEmpty: {},
        },
        objectRecursive: {
          null: null,
          numberEmpty: 0,
          stringEmpty: '',
          undefined: undefined,
          arrayEmpty: [],
          objectEmpty: {},
        },
      });
    });
  });

  describe('excludeKeys / excludeValues', () => {
    const data = { a: 1, b: 2, c: { d: 3, e: 4 } };

    it('should exclude top-level keys', () => {
      expect(DataHelper.excludeKeys(data, ['a'])).toEqual({ b: 2, c: { d: 3, e: 4 } });
    });

    it('should exclude nested keys recursively', () => {
      expect(DataHelper.excludeKeys(data, ['d'], true)).toEqual({ a: 1, b: 2, c: { e: 4 } });
    });

    it('should exclude specific values', () => {
      expect(DataHelper.excludeValues(data, [2])).toEqual({ a: 1, c: { d: 3, e: 4 } });
    });
  });

  describe('filterCircular', () => {
    it('should replace circular refs with placeholder', () => {
      const obj: { a: number; self: unknown } = { a: 1, self: undefined };
      obj.self = obj;
      const result = DataHelper.filterCircular(obj);
      expect(result).toEqual({ a: 1, self: '[Circular]' });
    });

    it('should handle Error objects', () => {
      const err = new Error('test');
      const filtered = DataHelper.filterCircular(err);
      expect(filtered).toHaveProperty('name');
      expect(filtered).toHaveProperty('message', 'test');
      expect(filtered).toHaveProperty('stack');
      expect(Array.isArray((filtered as { stack: unknown }).stack)).toBe(true);
    });
  });

  describe('applyCallback', () => {
    // it('should apply callback to all values', () => {
    //   const data = { a: 1, b: { c: 2 } };
    //   const res = DataHelper.applyCallback(data, (_k, v) => (typeof v === 'number' ? v * 2 : v), true);
    //   expect(res).toEqual({ a: 2, b: { c: 4 } });
    // });
  });

  describe('excludePath', () => {
    it('should strip prefix path', () => {
      expect(DataHelper.excludePath('/root/app/file', '/root')).toBe('app/file');
    });

    it('should return same if prefix not matched', () => {
      expect(DataHelper.excludePath('/other/file', '/root')).toBe('other/file');
    });
  });
});
