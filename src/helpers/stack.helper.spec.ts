import { LoggerOriginInterface, StackFrameInterface, StackHelper } from './stack.helper';

describe('StackHelper', () => {
  it('should parse stack traces and normalize project paths', () => {
    const root = process.cwd();
    const trace = StackHelper.toTrace(
      [
        `    at Service.run (${root}/src/service.ts:10:20)`,
        `    at root (${root}:1:2)`,
        '    at standalone (/external/file.ts:2:3)',
      ].join('\n'),
    );

    expect(StackHelper.toTrace()).toStrictEqual([]);
    expect(trace).toStrictEqual([
      { caller: 'Service', method: 'run', file: 'src/service.ts', line: 10, column: 20 },
      { caller: 'root', method: undefined, file: '.', line: 1, column: 2 },
      { caller: 'standalone', method: undefined, file: 'external/file.ts', line: 2, column: 3 },
    ]);
  });

  it('should resolve visible and fallback origins', () => {
    const hidden: StackFrameInterface = { file: 'node_modules/pkg/index.js', caller: 'Module' };
    const visible: StackFrameInterface = {
      file: 'src/index.ts',
      caller: 'Service',
      method: 'run',
      line: 1,
      column: 2,
    };

    expect(StackHelper.resolveOrigin([hidden, visible], 0)).toStrictEqual({ frame: visible, visible: true });
    expect(StackHelper.resolveOrigin([hidden], 0)).toStrictEqual({
      frame: { ...hidden, method: undefined, line: undefined, column: undefined },
      visible: false,
    });
    expect(StackHelper.resolveOrigin([], 0)).toStrictEqual({ visible: false });
    let reads = 0;
    const changingTrace = new Proxy([hidden], {
      get(target, property, receiver): unknown {
        if (property === '0') {
          reads++;
          return reads === 2 ? undefined : hidden;
        }
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    expect(StackHelper.resolveOrigin(changingTrace, 0).visible).toBe(false);
    expect(StackHelper.getVisibleItems([hidden, visible])).toStrictEqual([visible]);
  });

  it('should use caller and method as fallback frame signals', () => {
    const visibleSpy = jest.spyOn(StackHelper, 'isVisibleItem').mockReturnValue(false);
    const resolveChangingFrame = (frame: StackFrameInterface): LoggerOriginInterface => {
      let reads = 0;
      const trace = new Proxy([frame], {
        get(target, property, receiver): unknown {
          if (property === '0') {
            reads++;
            return reads === 2 ? undefined : frame;
          }
          return Reflect.get(target, property, receiver) as unknown;
        },
      });
      return StackHelper.resolveOrigin(trace, 0);
    };

    expect(resolveChangingFrame({ file: '', caller: 'Module' }).frame?.caller).toBe('Module');
    expect(resolveChangingFrame({ file: '', caller: '', method: 'run' }).frame?.method).toBe('run');
    visibleSpy.mockRestore();
  });

  it('should classify hidden frames', () => {
    expect(StackHelper.isVisibleItem({ file: 'node_modules/pkg/index.js', caller: 'call' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'node_modules\\pkg\\index.js', caller: 'call' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'internal/process/task.js', caller: 'call' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'node:events', caller: 'call' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'process' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Module' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Function' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: '<anonymous>' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: '' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'native', caller: 'call' })).toBe(false);
    expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Service' })).toBe(true);
    expect(StackHelper.isVisibleItem({} as StackFrameInterface)).toBe(false);
  });

  it('should clone and format frames', () => {
    const frame = { file: 'file.ts', caller: 'Service', method: 'run', line: 10, column: 2 };

    expect(StackHelper.cloneFrame(frame)).toStrictEqual(frame);
    expect(StackHelper.cloneFrame(frame)).not.toBe(frame);
    expect(StackHelper.formatFrameLocation(frame)).toBe('file.ts:10:2');
    expect(StackHelper.formatFrameLocation({ file: 'file.ts', caller: 'Service', line: 10 })).toBe('file.ts:10');
    expect(StackHelper.formatFrameLocation({ file: 'file.ts', caller: 'Service' })).toBe('file.ts');
  });
});
