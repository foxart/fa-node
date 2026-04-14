import { Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConsoleHelper } from '../helpers/console.helper';
import { ProcessHelper } from '../helpers/process.helper';
import { AppController } from './app.controller';
import { LoggerNestService } from './logger-nest.service';
import { LoggerNodeService } from './logger-node.service';
import { PROCESS_CONFIG } from './process.config';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [LoggerNestService, LoggerNodeService],
})
export class AppModule implements OnModuleInit, OnApplicationBootstrap {
  public constructor(private readonly logger: LoggerNodeService) {}

  public onModuleInit(): void {
    ProcessHelper.hook(this.logger, PROCESS_CONFIG);
    ConsoleHelper.override(this.logger);
  }

  public onApplicationBootstrap(): void {
    setTimeout(() => {
      throw new Error('onApplicationBootstrap');
    }, 100);
  }
}
