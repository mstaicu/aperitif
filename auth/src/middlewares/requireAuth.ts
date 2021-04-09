import type { Request, Response, NextFunction } from 'express';

import { RequestAuthenticationError } from '../errors';

const requireAuthentication = (req: Request, _: Response, next: NextFunction) =>
  req.user ? next() : next(new RequestAuthenticationError());

export { requireAuthentication };
