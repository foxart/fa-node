import { Controller, Get, OnApplicationBootstrap } from '@nestjs/common';

@Controller()
export class AppController implements OnApplicationBootstrap {
  public onApplicationBootstrap(): void {
    // throw new Error('Method not implemented.');
  }

  @Get()
  public index(): void {
    throw new Error('Not implemented');
  }
}
