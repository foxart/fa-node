export interface StackFrameInterface {
  file: string;
  caller: string;
  method?: string;
  line?: number;
  column?: number;
}

export interface LoggerOriginInterface {
  frame?: StackFrameInterface;
  visible: boolean;
}

const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

function normalizeTraceFilePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function isNodeModuleTraceFile(file: string): boolean {
  return normalizeTraceFilePath(file).includes('node_modules/');
}

function isNodeInternalTraceFile(file: string): boolean {
  const normalizedFile = normalizeTraceFilePath(file);
  return normalizedFile.startsWith('internal/') || normalizedFile.startsWith('node:');
}

function isRuntimeTraceCaller(caller: string): boolean {
  return caller === 'process' || caller === 'Module' || caller === 'Function';
}

function isAnonymousTraceFrame(caller: string, method: string): boolean {
  return caller === '<anonymous>' || (caller.length === 0 && method.length === 0);
}

function isNativeTraceFile(file: string): boolean {
  return file === 'native';
}

class StackHelperClass {
  public toTrace(stack = ''): StackFrameInterface[] {
    if (!stack) {
      return [];
    }
    const root = process.cwd();
    const result: StackFrameInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      const location = match[2];
      const locationMatch = /^(.*):(\d+):(\d+)$/.exec(location);
      let file = locationMatch?.[1] ?? location;
      if (root && file.startsWith(root)) {
        file = file.slice(root.length).replace(/^\/|\/$/g, '') || '.';
      } else {
        file = file.replace(/^\/|\/$/g, '');
      }
      result.push({
        caller,
        method,
        file,
        line: locationMatch ? Number(locationMatch[2]) : undefined,
        column: locationMatch ? Number(locationMatch[3]) : undefined,
      });
    }
    return result;
  }

  public resolveOrigin(trace: StackFrameInterface[], level: number): LoggerOriginInterface {
    const visibleFrame = trace.slice(level).find((item) => {
      return this.isVisibleItem(item);
    });
    if (visibleFrame) {
      return {
        frame: this.cloneFrame(visibleFrame),
        visible: true,
      };
    }
    const fallbackFrame =
      trace[level] ??
      trace.slice(level).find((item) => {
        return item.file || item.caller || item.method;
      });
    if (!fallbackFrame) {
      return { visible: false };
    }
    return {
      frame: this.cloneFrame(fallbackFrame),
      visible: false,
    };
  }

  public getVisibleItems(trace: StackFrameInterface[]): StackFrameInterface[] {
    return trace.filter((item) => this.isVisibleItem(item));
  }

  public isVisibleItem(item: StackFrameInterface): boolean {
    const { file = '', caller = '', method = '' } = item;
    return !(
      isNodeModuleTraceFile(file) ||
      isNodeInternalTraceFile(file) ||
      isRuntimeTraceCaller(caller) ||
      isAnonymousTraceFrame(caller, method) ||
      isNativeTraceFile(file)
    );
  }

  public cloneFrame(frame: StackFrameInterface): StackFrameInterface {
    return {
      file: frame.file,
      caller: frame.caller,
      method: frame.method,
      line: frame.line,
      column: frame.column,
    };
  }

  public formatFrameLocation(frame: StackFrameInterface): string {
    const parts = [frame.file];
    if (frame.line !== undefined) {
      parts.push(String(frame.line));
      if (frame.column !== undefined) {
        parts.push(String(frame.column));
      }
    }
    return parts.join(':');
  }
}

export const StackHelper = new StackHelperClass();
