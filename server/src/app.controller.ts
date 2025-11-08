import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /**
   * This is only used as a health check.
   */
  @Get()
  getHello(): string {
    return 'yes';
  }
}
