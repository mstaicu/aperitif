import { Request, Response, NextFunction } from 'express';

const healthz = (request: Request, response: Response, next: NextFunction) =>
  ['/health', '/healthz'].indexOf(request.path.toLowerCase()) >= 0 &&
  ['GET', 'HEAD'].indexOf(request.method) >= 0
    ? response.status(200).end()
    : next();

export { healthz };
