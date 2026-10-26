import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(request: Request, _response: Response, next: NextFunction) {
    this.logger.log(`${request.method} ${request.originalUrl}`);
    next();
  }
}
