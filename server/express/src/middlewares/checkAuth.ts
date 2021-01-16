import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { AuthenticationError } from '../errors';
import type { UserSession } from '../types/api';

const checkAuthentication = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer') {
    let payload: UserSession;

    try {
      payload = jwt.verify(token, process.env.SIGNATURE) as UserSession;
    } catch (err) {
      next(new AuthenticationError());
      return;
    }

    req.user = payload;
  }

  next();
};

export { checkAuthentication };
