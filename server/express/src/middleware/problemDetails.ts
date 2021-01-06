import { Request, Response, NextFunction } from 'express';

import { ProblemTypes, DefaultProblemType } from '../schemas/problem';

export const problemDetails = (
  error: any,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) {
    return next(error);
  }

  const problemType =
    ProblemTypes.find(
      (problemType: any) => error instanceof problemType.matchErrorClass,
    ) || DefaultProblemType;

  const problemDetails = {
    ...problemType.details,
    ...problemType.occurrenceDetails(error),
  };

  if (!problemDetails.status) {
    problemDetails.status = error.statusCode || 500;
  }

  /**
   * @see https://tools.ietf.org/html/rfc7807#section-3
   */
  response.set('Content-Type', 'application/problem+json');
  response.status(problemDetails.status).json(problemDetails);

  next();
};
