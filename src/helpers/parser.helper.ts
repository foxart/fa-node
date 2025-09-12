import { DataHelper } from './data.helper';

export interface ParserTraceInterface {
  file: string;
  caller: string;
  method: string;
}

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

class ParserSingleton {
  private static self: ParserSingleton;

  private readonly stackRegexp: RegExp;

  private readonly urlRegexp: RegExp;

  private constructor() {
    this.stackRegexp = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');
    // Группа 1 (.*?) — всё между at и ссылкой (лениво)
    // Группа 2 (\S+:\d+:\d+) — путь вплоть до :строка:столбец, без пробелов
    // Скобки вокруг ссылки — опциональны (\(? … \)?)
    this.urlRegexp = new RegExp(
      [
        '^(https?:)//', // protocol
        '(([^:/?#]*)(?::([0-9]+))?)', // host (hostname and port)
        '(/{0,1}[^?#]*)', // pathname
        // '(\\?[^#]*|)', // search
        // '(#.*|)$', // hash
        '(?:\\?([^#]*))?', // search (without the leading ?)
        '(?:#(.*))?$', // hash (without the leading #)
      ].join(''),
    );
  }

  public static getInstance(): ParserSingleton {
    if (!ParserSingleton.self) {
      ParserSingleton.self = new ParserSingleton();
    }
    return ParserSingleton.self;
  }

  public parseStack(stack = ''): ParserTraceInterface[] {
    const traceList: ParserTraceInterface[] = [];
    for (let match; (match = this.stackRegexp.exec(stack)); ) {
      const context = match[1].includes('.') ? match[1].split('.') : match[1].split(' ');
      const traceItem: ParserTraceInterface = {
        caller: context[0] || '',
        method: context[1] || '',
        file: match[2] || '',
      };
      traceList.push(traceItem);
    }
    return traceList;
  }
  public filterStack(stack = '', excludePath = ''): ParserTraceInterface[] {
    return ParserHelper.parseStack(stack)
      .filter((trace) => {
        return !trace.file.includes('node_modules/') && !trace.file.includes('node:');
      })
      .map((trace) => {
        return {
          ...trace,
          file: excludePath ? DataHelper.excludePath(trace.file, excludePath) : trace.file,
        };
      });
  }

  public parsePath(fullPath: string): PathInterface {
    const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
    return {
      directory: fullPath.substring(0, fullPath.lastIndexOf('/')),
      filename: fileName.substring(0, fileName.lastIndexOf('.')) || fileName,
      extension: fullPath.substring(fullPath.lastIndexOf('.')),
    };
  }

  public parseUrl(url: string): UrlInterface | null {
    const match = url.match(this.urlRegexp);
    return (
      match && {
        href: url,
        protocol: match[1],
        host: match[2],
        hostname: match[3],
        port: match[4],
        pathname: match[5],
        search: match[6],
        searchParams: this.parseUrlParams(match[6]),
        hash: match[7],
        hashParams: this.parseUrlParams(match[7]),
      }
    );
  }

  private parseUrlParams(paramString: string | undefined): { [key: string]: string } | undefined {
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
