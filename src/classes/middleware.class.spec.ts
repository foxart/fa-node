import { MiddlewareClass } from './middleware.class';

describe('MiddlewareClass', () => {
  it('should execute middleware in order and forward the transformed payload', () => {
    const middleware = new MiddlewareClass<number>();
    const next = jest.fn();
    middleware.add((value, proceed) => proceed(value + 1));
    middleware.add((value, proceed) => proceed(value * 2));

    middleware.use(2, next);

    expect(next).toHaveBeenCalledWith(6);
  });

  it('should call next immediately when no middleware exists', () => {
    const next = jest.fn();

    new MiddlewareClass<string>().use('value', next);

    expect(next).toHaveBeenCalledWith('value');
  });

  it('should reject an invalid recursive position', () => {
    const middleware = new MiddlewareClass<number>();
    const executor = (
      middleware as unknown as {
        executor: (payload: number, next: (payload: number) => void, current: number, previous: number) => void;
      }
    ).executor.bind(middleware);

    expect(() => executor(1, jest.fn(), 0, 1)).toThrow('multiple calls');
  });
});
