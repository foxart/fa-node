import { DataHelper } from './data.helper';

describe('DataHelper', () => {
  describe('isEmpty / isObject / isArray', () => {
    it('should detect empty values correctly', () => {
      expect(DataHelper.isEmpty(undefined, { undefined: true })).toBe(true);
      expect(DataHelper.isEmpty(null, { null: true })).toBe(true);
      expect(DataHelper.isEmpty('', { blankString: true })).toBe(true);
      expect(DataHelper.isEmpty(0, { zeroNumber: true })).toBe(true);
      expect(DataHelper.isEmpty([], { emptyArray: true })).toBe(true);
      expect(DataHelper.isEmpty({}, { emptyObject: true })).toBe(true);
    });

    it('should detect non-empty values correctly', () => {
      expect(DataHelper.isEmpty('x', { blankString: true })).toBe(false);
      expect(DataHelper.isEmpty(1, { zeroNumber: true })).toBe(false);
      expect(DataHelper.isEmpty([1], { emptyArray: true })).toBe(false);
      expect(DataHelper.isEmpty({ a: 1 }, { emptyObject: true })).toBe(false);
    });

    it('should detect object types', () => {
      expect(DataHelper.isObject({})).toBe(true);
      expect(DataHelper.isObject([])).toBe(false);
      expect(DataHelper.isObject(new Date())).toBe(false);
      expect(DataHelper.isObject(/regex/)).toBe(false);
      expect(DataHelper.isObject(Buffer.from('x'))).toBe(false);
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

  describe('convert functions', () => {
    it('should convert JSON safely', () => {
      const obj = { x: 1 };
      const json = DataHelper.convertToJson(obj);
      expect(DataHelper.convertFromJson(json)).toEqual(obj);
    });

    it('should handle invalid JSON safely', () => {
      expect(DataHelper.convertFromJson('not-json')).toBe('not-json');
    });

    it('should convert hex to RGB and back', () => {
      const rgb = DataHelper.convertHexToRgb('#ff00ff');
      expect(rgb).toEqual([255, 0, 255]);
      expect(DataHelper.convertRgbToHex(255, 0, 255)).toBe('#ff00ff');
    });
  });

  describe('filterCircular', () => {
    it('should replace circular refs with placeholder', () => {
      const obj: { a: number; self: unknown } = { a: 1, self: undefined };
      obj.self = obj;
      const result = DataHelper.filterCircular(obj);
      expect(result).toEqual({ a: 1, self: '[CIRCULAR]' });
    });

    it('should handle Error objects', () => {
      const err = new Error('test');
      const filtered = DataHelper.filterCircular(err);
      expect(filtered).toHaveProperty('name');
      expect(filtered).toHaveProperty('message', 'test');
      expect(filtered).toHaveProperty('stack');
    });
  });

  describe('random functions', () => {
    it('should generate random boolean', () => {
      const results = new Set(Array.from({ length: 20 }, () => DataHelper.randomBoolean()));
      expect(results.size).toBeGreaterThan(1);
    });

    it('should generate random integer in range', () => {
      const val = DataHelper.randomInteger(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    });

    it('should generate random float in range', () => {
      const val = DataHelper.randomFloat(1, 2);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(3);
    });

    it('should generate random color in hex', () => {
      const color = DataHelper.randomColor();
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should generate random date in range', () => {
      const start = new Date(2000, 0, 1);
      const end = new Date(2020, 0, 1);
      const date = DataHelper.randomDate(start, end);
      expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('should generate random string and word', () => {
      expect(DataHelper.randomString(5)).toHaveLength(5);
      expect(DataHelper.randomWord(5)).toMatch(/^[A-Z][a-z]+$/);
    });
  });

  describe('applyCallback', () => {
    it('should apply callback to all values', () => {
      const data = { a: 1, b: { c: 2 } };
      const res = DataHelper.applyCallback(data, (_k, v) => (typeof v === 'number' ? v * 2 : v), true);
      expect(res).toEqual({ a: 2, b: { c: 4 } });
    });
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
