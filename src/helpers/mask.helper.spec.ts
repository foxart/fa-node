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
});
