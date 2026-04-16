import { ConsoleHelper } from '@common/helpers/console.helper';
import { Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerNestService } from '../common/logger-nest.service';
import { LoggerNodeService } from '../common/logger-node.service';
import { UnhandledExceptionFilter } from '../common/unhandled-exception.filter';
import { AppController } from './app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    LoggerNestService,
    LoggerNodeService,
    {
      provide: APP_FILTER,
      useClass: UnhandledExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit, OnApplicationBootstrap {
  public constructor(private readonly loggerNodeService: LoggerNodeService) {}
  public onModuleInit(): void {
    // ProcessHelper.hook(PROCESS_CONFIG(app, logger));
    ConsoleHelper.override(this.loggerNodeService);
    // console.log('onModuleInit');
  }

  public onApplicationBootstrap(): void {
    setTimeout(() => {
      // throw new Error('Method not implemented.');
      process.exit(1);
    }, 500);
  }
}
