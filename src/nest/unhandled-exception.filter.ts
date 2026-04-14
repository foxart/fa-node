import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ApolloError } from 'apollo-server-errors';
import { Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { DataHelper } from '../helpers/data.helper';
import { ExceptionHelper } from '../helpers/exception.helper';
import { LoggerNodeService } from './logger-node.service';
import { isDevMode } from './utils';

type NestContextType = 'http' | 'graphql' | 'rpc' | 'ws';

@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter<Error> {
  public constructor(private readonly service: LoggerNodeService) {}

  public catch(error: Error, host: ArgumentsHost): void | Observable<unknown> {
    const type = host.getType<NestContextType>();
    switch (type) {
      case 'http': {
        const http = host.switchToHttp();
        // const httpRequest = http.getRequest<Request>();
        // const response = this.createExceptionResponse(ExceptionResponseContextEnum.HTTP, error, {
        //   url: httpRequest.url,
        //   path: httpRequest.path,
        //   method: httpRequest.method,
        //   body: httpRequest.body,
        //   params: httpRequest.params,
        //   query: httpRequest.query,
        // });
        this.service.error(error);
        const exception = ExceptionHelper.castToException(error);
        http
          .getResponse<Response>()
          .status(exception.status)
          .json({
            ...exception,
            stack: isDevMode() ? DataHelper.stackToTrace(exception.stack, true) : undefined,
          });
        break;
      }
      case 'graphql': {
        // const graphql = GqlArgumentsHost.create(host);
        // const request = RequestHelper.parseRequest(graphql.getContext<{ req: Request }>().req);
        // const graphqlQuery = GraphqlHelper.parseGraphqlQuery(request.graphqlQuery as string, request.graphqlVariables);
        // const response = this.createExceptionResponse(ExceptionResponseContextEnum.GRAPHQL, error, {
        //   url: graphqlRequest.baseUrl,
        //   path: graphqlRequest.path,
        //   type: graphqlBody.type,
        //   operation: graphqlBody.operation,
        // });
        // this.loggerAppService.repository({
        //   level: ConsoleLevelEnum.ERR,
        //   data: error,
        //   metadata: undefined,
        //   expiresAt: undefined,
        //   keywords: [],
        // });
        this.service.repository({
          level: 'ERR',
          data: error,
        });
        const exception = ExceptionHelper.castToException(error);
        throw new ApolloError(exception.message, exception.code, { stack: exception.stack });
      }
      case 'rpc': {
        // const rpc = host.switchToRpc();
        // const rpcMessage = rpc.getContext<RmqContext>().getMessage() as RpcMessageInterface;
        // const rpcContent = JSON.parse(rpcMessage.content.toString('utf8')) as RpcMessageContentInterface;
        // const response = this.createExceptionResponse(ExceptionResponseContextEnum.RPC, error, {
        //   id: rpcContent.id,
        //   routingKey: rpcMessage.fields.routingKey,
        //   pattern: rpcContent.pattern,
        //   data: rpcContent.data,
        // correlationId: rpcMessage.properties.correlationId,
        // replyTo: rpcMessage.properties.replyTo,
        // });
        this.service.error(error);
        return throwError(() => error);
      }
      case 'ws': {
        // const client = host.switchToWs().getClient();
        // const data = host.switchToWs().getData();
        // const error = exception instanceof WsException ? exception.getError() : exception.getResponse();
        // const details = error instanceof Object ? { ...error } : { message: error };
        // client.send(
        //   JSON.stringify({
        //     event: 'error',
        //     data: {
        //       id: client.id,
        //       rid: data.rid,
        //       ...details,
        //     },
        //   }),
        // );
        this.service.error(error.message);
        break;
      }
      default: {
        throw new Error(error.name);
      }
    }
  }
}
