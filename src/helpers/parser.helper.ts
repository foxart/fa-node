import path from 'path';

type GraphqlRequestBodyType = Record<'query' | 'mutation' | 'subscription', string>;

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

  private readonly cwd: string;

  private readonly stackRegexp: RegExp;

  private readonly urlRegexp: RegExp;

  private constructor() {
    this.cwd = process.cwd();
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

  public stack(stack?: string, options?: StackOptionInterface): string[] {
    const result: string[] = [];
    let match = this.stackRegexp.exec(stack || '');
    while (match) {
      if (match[0].indexOf(this.cwd) !== -1) {
        result.push(options?.full ? match[0] : path.relative(this.cwd, match[0]));
      }
      match = this.stackRegexp.exec(stack || '');
    }
    return result;
  }

  public path(fullPath: string): PathInterface {
    return {
      directory: path.dirname(fullPath),
      filename: path.basename(fullPath, path.extname(fullPath)),
      extension: path.extname(fullPath),
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
}

export const ParserHelper = ParserSingleton.getInstance();
