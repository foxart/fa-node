import { DataHelper } from '../../src';

class EmptyClass {}

class ValueClass {
  public readonly data: string = 'data';
}

class ObjectId {
  private readonly id: string;

  public constructor() {
    this.id = '65aa4ceac632b427f4311ad3';
  }

  public toString(): string {
    return this.id;
  }
}

const objectEmptyValues = {
  undefined: undefined,
  null: null,
  zeroNumber: 0,
  emptyString: '',
  emptyObject: {},
  emptyArray: [],
  emptyClass: new EmptyClass(),
};
const objectValues = {
  number: 1,
  string: 'string',
  array: [1, 'string', Object.values(objectEmptyValues)],
  object: { keyNumber: 1, keyString: '2' },
  objectId: new ObjectId(),
  date: new Date(),
  regex: new RegExp('/.+/g'),
  valueClass: new ValueClass(),
};

function splitObjectByTrueFalse(obj: { [key: string]: boolean }): {
  trueValues: { [key: string]: boolean };
  falseValues: { [key: string]: boolean };
} {
  const trueValues: { [key: string]: boolean } = {};
  const falseValues: { [key: string]: boolean } = {};
  for (const key in obj) {
    if (obj[key]) {
      trueValues[key] = obj[key];
    } else {
      falseValues[key] = obj[key];
    }
  }
  return { trueValues, falseValues };
}

function testFilter(): object {
  const options = {
    undefined: true,
    nullValue: true,
    zeroNumber: true,
    emptyString: true,
    // emptyObject: true,
    recursive: true,
  };
  // todo: empty object also filters array
  const data = {
    ...objectEmptyValues,
    valueObject: { ...objectEmptyValues, ...objectValues },
  };
  return DataHelper.filterEmpty(data);
}

function testIsClass(): object {
  const data = { ...objectEmptyValues, ...objectValues };
  const result = Object.entries(data).reduce(
    (acc, [key, value]) => {
      acc[key] = DataHelper.isInstance(value);
      return acc;
    },
    {} as Record<string, boolean>,
  );
  return splitObjectByTrueFalse(result);
}

function testIsObject(): object {
  const data = { ...objectEmptyValues, ...objectValues };
  const result = Object.entries(data).reduce(
    (acc, [key, value]) => {
      acc[key] = DataHelper.isObject(value);
      return acc;
    },
    {} as Record<string, boolean>,
  );
  return splitObjectByTrueFalse(result);
}

function testIsEmptyObject(): object {
  const data = { ...objectEmptyValues, ...objectValues };
  const result = Object.entries(data).reduce(
    (acc, [key, value]) => {
      acc[key] = DataHelper.isObjectEmpty(value);
      return acc;
    },
    {} as Record<string, boolean>,
  );
  return splitObjectByTrueFalse(result);
}

function testIsPlainObject(): object {
  const data = { ...objectEmptyValues, ...objectValues };
  const result = Object.entries(data).reduce(
    (acc, [key, value]) => {
      acc[key] = DataHelper.isObject(value);
      return acc;
    },
    {} as Record<string, boolean>,
  );
  return splitObjectByTrueFalse(result);
}

export function run(): void {
  console.clear();
  // console.log(testFilter());
  // console.log('testIsClass', testIsClass());
  // console.log('testIsObject', testIsObject());
  // console.log('testIsEmptyObject', testIsEmptyObject());
  // console.log('testIsPlainObject', testIsPlainObject());
  const options = {
    array: {
      undefined: true,
      nullValue: true,
      zeroNumber: true,
      emptyString: true,
      emptyArray: true,
      emptyObject: true,
    },
    object: {
      undefined: true,
      nullValue: true,
      zeroNumber: true,
      emptyString: true,
      emptyArray: true,
      emptyObject: true,
    },
  };
  const object = { a: undefined, b: null, c: 0, d: '123', e: {}, f: [] };
  const test = [object, '', null, undefined, {}, ['']];
  // const res = DataHelper.filterEmpty(test, options, true);
  const res = DataHelper.excludeKeys(object, ['d'], true);
  console.info(res);
  // console.warn(test);
}
