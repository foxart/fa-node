import { ConsoleHelper } from '@common/helpers/console.helper';
import { Module, OnModuleInit } from '@nestjs/common';
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
export class AppModule implements OnModuleInit {
  public constructor(private readonly logger: LoggerNodeService) {}

  public onModuleInit(): void {
    ConsoleHelper.override(this.logger);
  }
}
