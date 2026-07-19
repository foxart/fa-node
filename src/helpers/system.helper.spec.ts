import { SystemHelper } from './system.helper';

describe('SystemHelper', () => {
  it('should measure named and default timers', () => {
    SystemHelper.timeStart();
    expect(SystemHelper.timeEnd()).toBeGreaterThanOrEqual(0);
    SystemHelper.timeStart('named');
    expect(SystemHelper.timeEnd('named')).toBeGreaterThanOrEqual(0);
  });

  it('should sleep for the requested duration', async () => {
    jest.useFakeTimers();
    const promise = SystemHelper.sleep('10ms');
    await jest.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
