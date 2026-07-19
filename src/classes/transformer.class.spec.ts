import { TransformerClass } from './transformer.class';

describe('TransformerClass', () => {
  class Model {
    public value = '';
  }

  it('should expose options and transform in both directions', () => {
    const options = { exposeDefaultValues: true };
    const transformer = new TransformerClass(options);
    const instance = transformer.plainToInstance({ value: 'test' }, Model);

    expect(transformer.options).toBe(options);
    expect(instance).toBeInstanceOf(Model);
    expect(instance.value).toBe('test');
    expect(transformer.instanceToPlain(instance)).toStrictEqual({ value: 'test' });
  });
});
