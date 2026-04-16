import { LoggerNestService } from '@nest/common/logger-nest.service';
import { LoggerNodeService } from '@nest/common/logger-node.service';
import { UnhandledExceptionFilter } from '@nest/common/unhandled-exception.filter';
import { Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConsoleHelper } from '../../src';
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
    ConsoleHelper.override(this.loggerNodeService);
    // console.log('onModuleInit');
  }

  public onApplicationBootstrap(): void {
    setTimeout(() => {
      // throw new Error('Method not implemented.');
      // process.exit(0);
      // process.exit(1);
      // process.kill(process.pid, 'SIGTERM');
    }, 500);
  }
}
