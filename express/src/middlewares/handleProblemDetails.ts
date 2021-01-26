import type { Request, Response, NextFunction } from 'express';

import type {
  ValidationError,
  AuthorizationError,
  AuthenticationError,
} from '../errors';

type Error = AuthenticationError | AuthorizationError | ValidationError;

const handleProblemDetails = (
  error: Error,
  _: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    return next(error);
  }

  response.set('Content-Type', 'application/problem+json');
  response.status(error.problemDetails.status).json(error.problemDetails);

  next();
};

export { handleProblemDetails };
