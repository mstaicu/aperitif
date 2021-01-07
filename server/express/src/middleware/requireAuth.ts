import { Request, Response, NextFunction } from 'express';

import { RequestAuthenticationError } from '../errors';

const requireAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  req.user ? next() : next(new RequestAuthenticationError());
};

export { requireAuthentication };
