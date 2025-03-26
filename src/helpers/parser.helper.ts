type GraphqlRequestBodyType = Record<'query' | 'mutation' | 'subscription', string>;

export interface ParserTraceInterface {
  file: string;
  context?: string;
  method?: string;
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
    // this.stackRegexp = /\/?(\/.+:\d+:\d+)/gm;
    // this.stackRegexp = /\/?[a-zA-Z0-9@_.\/\-]+(?:\.js|\.ts):\d+:\d+/gm;
    this.stackRegexp = new RegExp('\\/?[a-zA-Z0-9@_.\\/\\-]+(?:\\.js|\\.ts):\\d+:\\d+', 'gm');
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
    // const result: string[] = [];
    // let match = this.stackRegexp.exec(stack || '');
    // while (match) {
    //   if (match[0].indexOf(this.cwd) !== -1) {
    //     result.push(options?.full ? match[0] : path.relative(this.cwd, match[0]));
    //   }
    //   match = this.stackRegexp.exec(stack || '');
    // }
    // return result;
    const result: ParserTraceInterface[] = [];
    const errorStack = stack || new Error().stack || '';
    const stackLines = errorStack.split('\n').slice(1);
    for (const line of stackLines) {
      const match = line.match(this.stackRegexp);
      if (match) {
        const file = options?.full ? match[0] : this.relativePath(this.getCwd(), match[0]);
        const methodMatch = line.match(/at (\S+) \(/);
        const fullMethodName = methodMatch?.[1];
        const context = fullMethodName?.includes('.') ? fullMethodName.split('.')[0] : undefined;
        const method = fullMethodName?.includes('.') ? fullMethodName.split('.')[1] : undefined;
        result.push({
          file,
          context,
          method,
        });
      }
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
    const baseParts = basePath.split('/');
    const targetParts = targetPath.split('/');
    while (baseParts.length && targetParts.length && baseParts[0] === targetParts[0]) {
      baseParts.shift();
      targetParts.shift();
    }
    return `${'../'.repeat(baseParts.length)}${targetParts.join('/')}`;
  }
}

export const ParserHelper = ParserSingleton.getInstance();
