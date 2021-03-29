import type { Request, Response, NextFunction } from 'express';

import { CustomError } from '../errors';

const handleErrors = (
  error: Error,
  _: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof CustomError) {
    response.set('Content-Type', 'application/problem+json');
    return response.status(error.statusCode).json(error.serializeResponse());
  }

  next(error);
};

export { handleErrors };
