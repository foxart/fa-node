import { ConverterHelper } from '../../src/helpers/converter.helper';

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
  array: [1, 'string', new ValueClass()],
  object: { keyNumber: 1, keyString: '2', class: new ValueClass() },
  objectId: new ObjectId(),
  date: new Date(),
  regex: new RegExp('/.+/g'),
  valueClass: new ValueClass(),
};

function testMapObjectKeys(): object {
  const data = { ...objectEmptyValues, valueObject: { ...objectEmptyValues, ...objectValues } };
  return ConverterHelper.mapObjectKeys(
    data,
    (key) => {
      return `MAPPED_${key}_MAPPED`;
    },
    true,
  );
}

function testSeparator(): object {
  function arrayToObject(array: string[]): { [key: string]: string } {
    return array.reduce(
      (obj, item) => {
        obj[item] = item;
        return obj;
      },
      {} as { [key: string]: string },
    );
  }

  const upperData = ['LoremIpsumDolor', 'loremIpsumDolor'];
  const separatorData = ['Lorem-Ipsum-Dolor', 'lorem-Ipsum-Dolor'];
  return {
    upperToSeparator: Object.entries(arrayToObject(upperData)).reduce(
      (acc, [key, value]) => {
        acc[key] = ConverterHelper.upperToSeparator(value, '-');
        return acc;
      },
      {} as Record<string, string>,
    ),
    separatorToCamel: Object.entries(arrayToObject(separatorData)).reduce(
      (acc, [key, value]) => {
        acc[key] = ConverterHelper.separatorToCamel(value, '-');
        return acc;
      },
      {} as Record<string, string>,
    ),
    separatorToPascal: Object.entries(arrayToObject(separatorData)).reduce(
      (acc, [key, value]) => {
        acc[key] = ConverterHelper.separatorToPascal(value, '-');
        return acc;
      },
      {} as Record<string, string>,
    ),
  };
}

export function run(): void {
  console.clear();
  console.log(testMapObjectKeys());
  // console.log(testSeparator());
}
