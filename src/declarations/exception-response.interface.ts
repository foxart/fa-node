import { ApolloCodeEnum } from './apollo-code.enum';

export enum ExceptionResponseContextEnum {
  'HTTP' = 'Http',
  'GRAPHQL' = 'Graphql',
  'RPC' = 'Rpc',
  'WS' = 'WebSocket',
  'UNKNOWN' = 'Unknown',
}

export enum ExceptionResponseTypeEnum {
  HTTP_EXCEPTION = 'HttpException',
  APOLLO_ERROR = 'ApolloError',
  MONGO_ERROR = 'MongoError',
  ERROR_CLASS = 'ErrorClass',
  ERROR = 'Error',
  UNKNOWN = 'Unknown',
}

export interface ExceptionResponseInterface extends Record<string, unknown> {
  code: ApolloCodeEnum;
  context: ExceptionResponseContextEnum;
  message: string;
  metadata: unknown;
  name: string;
  payload: Record<string, unknown>;
  status: number;
  timestamp: string;
  // trace: string[];
  type: ExceptionResponseTypeEnum;
  details?: object;
  stack?: string;
}
