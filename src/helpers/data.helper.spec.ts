import { DataHelper } from './data.helper';

describe('DataHelper', () => {
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

  describe('remaining data transformations', () => {
    it('should exclude keys from arrays and preserve primitive values', () => {
      expect(DataHelper.excludeKeys([{ remove: 1, keep: 2 }], ['remove'], true)).toStrictEqual([{ keep: 2 }]);
      expect(DataHelper.excludeKeys('value', ['remove'])).toBe('value');
    });

    it('should recursively exclude values from arrays and objects', () => {
      const data = [1, 2, { keep: 3, remove: 2, nested: { remove: 2, keep: 4 } }];

      expect(DataHelper.excludeValues(data, [2], true)).toStrictEqual([
        1,
        {
          keep: 3,
          nested: { keep: 4 },
        },
      ]);
      expect(DataHelper.excludeValues('value', ['other'])).toBe('value');
    });

    it('should handle empty and exact excluded paths', () => {
      expect(DataHelper.excludePath('/root/file')).toBe('/root/file');
      expect(DataHelper.excludePath('/root/', '/root')).toBe('.');
    });

    it('should omit empty array items and support non-recursive objects', () => {
      const options = { blankString: true, emptyArray: true, emptyObject: true };

      expect(DataHelper.omitEmpty({ value: 'value' })).toStrictEqual({ value: 'value' });
      expect(DataHelper.omitEmpty(['', 'value', [], {}], options)).toStrictEqual(['value']);
      expect(
        DataHelper.omitEmpty(
          {
            nested: { empty: '' },
            array: [''],
          },
          options,
          false,
        ),
      ).toStrictEqual({
        nested: { empty: '' },
        array: [''],
      });
      expect(DataHelper.omitEmpty('value', options)).toBe('value');
    });

    it('should deeply merge objects and arrays with configurable nullish handling', () => {
      const target = {
        nested: { first: 1 },
        values: [1],
        nullable: 'value',
        optional: 'value',
      };
      const source = {
        nested: { second: 2 },
        values: [2],
        nullable: null,
        optional: undefined,
      };

      expect(DataHelper.mergeDeep(target, source)).toStrictEqual({
        nested: { first: 1, second: 2 },
        values: [2],
        nullable: null,
        optional: 'value',
      });
      expect(DataHelper.mergeDeep(target, source, { null: false, undefined: true, array: true })).toStrictEqual({
        nested: { first: 1, second: 2 },
        values: [1, 2],
        nullable: 'value',
        optional: undefined,
      });
      expect(DataHelper.mergeDeep([1], [2], { array: true })).toStrictEqual([2]);
    });

    it('should pick empty values from arrays, objects, and scalars', () => {
      const options = { blankString: true, emptyArray: true, emptyObject: true };

      expect(DataHelper.pickEmpty({ value: 'value' })).toStrictEqual({});
      expect(DataHelper.pickEmpty(['', 'value', [], {}, ['']], options)).toStrictEqual(['', {}, [], {}, ['']]);
      expect(DataHelper.pickEmpty(['', [], {}], { blankString: true })).toStrictEqual(['']);
      expect(DataHelper.pickEmpty({ emptyArray: [], emptyObject: {} }, {}, false)).toStrictEqual({});
      expect(
        DataHelper.pickEmpty(
          {
            emptyArray: [],
            nonEmptyArray: [''],
            emptyObject: {},
            nonEmptyObject: { empty: '' },
            value: 'value',
          },
          options,
          false,
        ),
      ).toStrictEqual({
        emptyArray: [],
        nonEmptyArray: [''],
        emptyObject: {},
        nonEmptyObject: { empty: '' },
      });
      expect(DataHelper.pickEmpty('', { blankString: true })).toBe('');
      expect(DataHelper.pickEmpty('value', { blankString: true })).toStrictEqual({});
    });

    it('should apply callbacks to arrays and objects recursively', () => {
      const callback = (key: string | number, value: unknown): [string | number, unknown] => {
        return [
          typeof key === 'string' ? key.toUpperCase() : key,
          typeof value === 'number' ? value * 2 : value,
        ];
      };

      expect(DataHelper.applyCallback([1, { value: 2 }], callback, true)).toStrictEqual([2, { VALUE: 4 }]);
      expect(DataHelper.applyCallback([1], callback)).toStrictEqual([2]);
      expect(DataHelper.applyCallback({ first: 1, nested: { second: 2 } }, callback, true)).toStrictEqual({
        FIRST: 2,
        NESTED: { SECOND: 4 },
      });
      expect(DataHelper.applyCallback({ first: 1 }, callback)).toStrictEqual({ FIRST: 2 });
      expect(DataHelper.applyCallback('value', callback)).toBe('value');
    });

    it('should filter arrays, non-plain objects, inherited keys, and JSON errors', () => {
      const array: unknown[] = [1];
      array.push(array);
      class Custom {
        public value = true;
      }
      const prototype = { inherited: true };
      const object = Object.assign(Object.create(prototype) as Record<string, unknown>, { own: 'value' });
      const jsonError = Object.assign(new Error('{"field":"invalid"}'), { messageIsJson: true });
      const invalidJsonError = Object.assign(new Error('invalid json'), { messageIsJson: true });

      expect(DataHelper.filterCircular(array)).toStrictEqual([1, '[Circular]']);
      expect(DataHelper.filterCircular(new Custom())).toBeInstanceOf(Custom);
      expect(DataHelper.filterCircular(object)).toBe(object);
      expect(DataHelper.filterCircular(null)).toBeNull();
      expect(DataHelper.filterCircular(1)).toBe(1);
      expect(DataHelper.filterCircular(jsonError)).toMatchObject({ message: { field: 'invalid' } });
      expect(DataHelper.filterCircular(invalidJsonError)).toMatchObject({ message: 'invalid json' });
    });

    it('should parse and filter stack traces', () => {
      const root = process.cwd();
      const stack = [
        `    at Service.run (${root}/src/file.ts:1:2)`,
        '    at Module.run (/project/node_modules/pkg/index.js:2:3)',
        '    at process (node:internal/process/task.js:3:4)',
        '    at . (/anonymous/file.ts:3:4)',
        '    at standalone (/external/file.ts:4:5)',
      ].join('\n');

      expect(DataHelper.stackToTrace()).toStrictEqual([]);
      expect(DataHelper.stackToTrace(stack)).toHaveLength(5);
      expect(DataHelper.stackToTrace(stack, true)).toStrictEqual([
        {
          caller: 'Service',
          method: 'run',
          file: 'src/file.ts:1:2',
        },
        {
          caller: 'standalone',
          method: undefined,
          file: 'external/file.ts:4:5',
        },
      ]);

      const mutable = DataHelper as unknown as { isNode: boolean };
      mutable.isNode = false;
      try {
        expect(DataHelper.stackToTrace('    at Service.run (/absolute/file.ts:1:2)')[0].file).toBe(
          '/absolute/file.ts:1:2',
        );
      } finally {
        mutable.isNode = true;
      }
    });

    it('should build a unique normalized keyword list', () => {
      expect(DataHelper.keywordListFromWordList([])).toStrictEqual([]);
      expect(DataHelper.keywordListFromWordList(['', 'HelloWorld', 'hello world'])).toStrictEqual([
        'hello',
        'world',
      ]);
    });
  });
});
