import type { Request, Response, NextFunction } from 'express';

import { AuthenticationError } from '../errors';

const requireAuthentication = (req: Request, _: Response, next: NextFunction) =>
  req.user ? next() : next(new AuthenticationError());

export { requireAuthentication };
