interface PathInterface {
  directory: string;
  filename: string;
  extension: string;
}

interface UrlInterface {
  href: string;
  protocol?: string;
  host?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  searchParams?: { [key: string]: string };
  hash?: string;
  hashParams?: { [key: string]: string };
}

export interface ParserTraceInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

class ParserSingleton {
  private static self: ParserSingleton;
  private static readonly stackRegexp = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

  private static readonly urlRegexp: RegExp = new RegExp(
    [
      '^(https?:)//', // protocol
      '(([^:/?#]*)(?::([0-9]+))?)', // host (hostname and port)
      '(/{0,1}[^?#]*)', // pathname
      '(?:\\?([^#]*))?', // search (without the leading ?)
      '(?:#(.*))?$', // hash (without the leading #)
    ].join(''),
  );

  public static getInstance(): ParserSingleton {
    if (!ParserSingleton.self) {
      ParserSingleton.self = new ParserSingleton();
    }
    return ParserSingleton.self;
  }

  public json<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }

  public path(fullPath: string): PathInterface {
    const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
    return {
      directory: fullPath.substring(0, fullPath.lastIndexOf('/')),
      filename: fileName.substring(0, fileName.lastIndexOf('.')) || fileName,
      extension: fullPath.substring(fullPath.lastIndexOf('.')),
    };
  }

  public stack(stack = ''): ParserTraceInterface[] {
    if (!stack) return [];
    const regexp = new RegExp(ParserSingleton.stackRegexp.source, 'gm');
    const result: ParserTraceInterface[] = [];
    for (const match of stack.matchAll(regexp)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      result.push({
        caller,
        method,
        file: match[2],
      });
    }
    return result;
  }

  public url(url: string): UrlInterface | null {
    const regexp = new RegExp(ParserSingleton.urlRegexp.source);
    const match = url.match(regexp);
    return (
      match && {
        href: url,
        protocol: match[1],
        host: match[2],
        hostname: match[3],
        port: match[4],
        pathname: match[5],
        search: match[6],
        searchParams: this.urlParams(match[6]),
        hash: match[7],
        hashParams: this.urlParams(match[7]),
      }
    );
  }

  private urlParams(paramString: string | undefined): { [key: string]: string } | undefined {
    if (!paramString) {
      return undefined;
    }
    return paramString
      .split('&')
      .map((param) => {
        return param.split('=');
      })
      .reduce(
        (acc, [key, value]) => {
          acc[key] = decodeURIComponent(value || '');
          return acc;
        },
        {} as { [key: string]: string },
      );
  }
}

export const ParserHelper = ParserSingleton.getInstance();
