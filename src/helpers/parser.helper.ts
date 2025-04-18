type GraphqlRequestBodyType = Record<'query' | 'mutation' | 'subscription', string>;

export interface ParserTraceInterface {
  file: string;
  caller: string;
  method: string;
}

enum GraphqlOperationTypeEnum {
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  UNKNOWN = 'UNKNOWN',
}

interface GraphqlOperationInterface {
  type: GraphqlOperationTypeEnum;
  operation: string;
}

interface StackOptionInterface {
  full?: boolean;
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
  hash?: string;
}

class ParserSingleton {
  private static self: ParserSingleton;

  private readonly stackRegexp: RegExp;

  private readonly urlRegexp: RegExp;

  private constructor() {
    this.stackRegexp = new RegExp('^ *at\\s+(.+?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');
    // Группа 1 (.+?) — всё между at и ссылкой (лениво)
    // Группа 2 (\S+:\d+:\d+) — путь вплоть до :строка:столбец, без пробелов
    // Скобки вокруг ссылки — опциональны (\(? … \)?)
    this.urlRegexp = new RegExp(
      [
        '^(https?:)//', // protocol
        '(([^:/?#]*)(?::([0-9]+))?)', // host (hostname and port)
        '(/{0,1}[^?#]*)', // pathname
        '(\\?[^#]*|)', // search
        '(#.*|)$', // hash
      ].join(''),
    );
  }

  public static getInstance(): ParserSingleton {
    if (!ParserSingleton.self) {
      ParserSingleton.self = new ParserSingleton();
    }
    return ParserSingleton.self;
  }

  public graphqlBody(body: GraphqlRequestBodyType): GraphqlOperationInterface {
    if (!!body.query) {
      return {
        type: GraphqlOperationTypeEnum.QUERY,
        operation: body.query.replace(/\s+/g, ' ').trim(),
      };
    } else if (!!body.mutation) {
      return {
        type: GraphqlOperationTypeEnum.MUTATION,
        operation: body.mutation.replace(/\s+/g, ' ').trim(),
      };
    } else {
      return {
        type: GraphqlOperationTypeEnum.SUBSCRIPTION,
        operation: body.subscription.replace(/\s+/g, ' ').trim(),
      };
    }
  }

  public stack(stack?: string, options?: StackOptionInterface): ParserTraceInterface[] {
    const result: ParserTraceInterface[] = [];
    let match;
    const stackTrace = stack || new Error().stack || '';
    while ((match = this.stackRegexp.exec(stackTrace)) !== null) {
      const context = match[1].includes('.') ? match[1].split('.') : match[1].split(' ');
      const file = match[2] || '';
      result.push({
        caller: context[0] || '',
        method: context[1] || '',
        file: options?.full ? file : this.relativePath(this.getCwd(), file),
      });
    }
    return result;
  }

  public path(fullPath: string): PathInterface {
    return {
      directory: this.getDirectory(fullPath),
      filename: this.getFilenameWithoutExtension(fullPath),
      extension: this.getFileExtension(fullPath),
    };
  }

  public url(url: string): UrlInterface | null {
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
        hash: match[7],
      }
    );
  }

  /**
   *
   */

  private getCwd(): string {
    if (typeof process !== 'undefined' && process.cwd) {
      return process.cwd();
    }
    return '/';
  }

  private getDirectory(fullPath: string): string {
    return fullPath.substring(0, fullPath.lastIndexOf('/'));
  }

  private getFilenameWithoutExtension(fullPath: string): string {
    const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
    return fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  }

  private getFileExtension(fullPath: string): string {
    return fullPath.substring(fullPath.lastIndexOf('.'));
  }

  private relativePath(basePath: string, targetPath: string): string {
    if (targetPath.startsWith(basePath)) {
      const cleanedPath = targetPath.replace(basePath, '').replace(/^\/|\/$/g, '');
      return cleanedPath || '.'; // Return '.' if the cleaned path is empty
    }
    return targetPath.replace(/^\/|\/$/g, '');
  }
}

export const ParserHelper = ParserSingleton.getInstance();
