import { Request, Response, NextFunction } from 'express';

import { RequestValidationError } from '../types';

const problemDetails = (
  error: RequestValidationError,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    return next(error);
  }

  response.set('Content-Type', 'application/problem+json');
  response.status(error.statusCode).json(error.problemDetails);

  next();
};

export { problemDetails };
