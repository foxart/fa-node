import { MaskHelper } from './mask.helper';

describe('MaskHelper', () => {
  it('should fully and partially mask matching nested values', () => {
    const values = ['visible'];
    const dictionary = {
      nested: {
        apiToken: 'Ab-12',
        shortOne: 'A',
        shortTwo: 'AB',
        shortValue: 'Ab12',
        longValue: 'abcDEF123xyz',
        emptyValue: null,
        untouched: 42,
      },
      values,
    };

    const result = MaskHelper.mask(dictionary, ['token'], ['short', 'long', 'empty']);

    expect(result).toStrictEqual({
      nested: {
        apiToken: '**-**',
        shortOne: 'A',
        shortTwo: 'AB',
        shortValue: 'A**2',
        longValue: 'abc******xyz',
        emptyValue: '',
        untouched: 42,
      },
      values,
    });
    expect(result.values).toBe(values);
  });

  it('should mask array values when their key matches', () => {
    const dictionary = {
      apiTokens: ['Ab-12', 42, null, ['Xy9'], { primary: 'Secret' }],
      partialValues: ['abcDEF123xyz', 'AB'],
    };

    const result = MaskHelper.mask(dictionary, ['token'], ['partial']);

    expect(result).toStrictEqual({
      apiTokens: ['**-**', '**', '', ['***'], { primary: '******' }],
      partialValues: ['abc******xyz', 'AB'],
    });
    expect(result.apiTokens).not.toBe(dictionary.apiTokens);
    expect(result.partialValues).not.toBe(dictionary.partialValues);
  });

  it('should recursively mask matching keys in array objects', () => {
    const dictionary = {
      values: [
        {
          apiToken: 'Ab-12',
          untouched: 'visible',
        },
        [{ longValue: 'abcDEF123xyz' }],
        'visible',
      ],
    };

    const result = MaskHelper.mask(dictionary, ['token'], ['long']);

    expect(result).toStrictEqual({
      values: [
        {
          apiToken: '**-**',
          untouched: 'visible',
        },
        [{ longValue: 'abc******xyz' }],
        'visible',
      ],
    });
    expect(result.values).not.toBe(dictionary.values);
  });
});
