import { Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConsoleHelper } from '../helpers/console.helper';
import { LoggerNestService } from './logger-nest.service';
import { LoggerNodeService } from './logger-node.service';

@Module({
  imports: [],
  controllers: [],
  providers: [LoggerNestService, LoggerNodeService],
})
export class AppModule implements OnModuleInit, OnApplicationBootstrap {
  public constructor(private readonly logger: LoggerNodeService) {}

  public onModuleInit(): void {
    ConsoleHelper.override(this.logger);
  }

  public onApplicationBootstrap(): void {
    setTimeout(() => {
      throw new Error('onApplicationBootstrap');
    }, 100);
  }
}
