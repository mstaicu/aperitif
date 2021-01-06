import { Request, Response, NextFunction } from 'express';

// TODO: Type the problemTypes
export const configureProblemDetailsResponse = (problemTypes: any) => {
  return (
    error: any,
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    /**
     * If response headers have already been sent,
     * delegate to the default Express error handler.
     */

    if (response.headersSent) {
      return next(error);
    }

    const problemType = problemTypes.find(
      (problemType: any) => error instanceof problemType.matchErrorClass,
    );

    // TODO: If !problemType, we should have a default problem details object
    const problemDetails = {
      ...problemType.details,
      ...problemType.occurrenceDetails(error),
    };

    if (!problemDetails.status) {
      problemDetails.status = error.statusCode || 500;
    }

    /**
     * Set the correct media type for a response containing a
     * JSON formatted problem details object.
     *
     * @see https://tools.ietf.org/html/rfc7807#section-3
     */

    response.set('Content-Type', 'application/problem+json');
    response.status(problemDetails.status).json(problemDetails);

    next();
  };
};
