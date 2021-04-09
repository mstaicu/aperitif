import type { Schema } from 'ajv';
import type { Request, Response, NextFunction } from 'express';

import { RequestValidationError } from '../errors';
import { ajv } from '../services/validation';

const validateRequestBody = (bodySchema: Schema) => {
  const validate = ajv.compile(bodySchema);

  return (req: Request, _: Response, next: NextFunction) => {
    if (!validate(req.body)) {
      next(new RequestValidationError(validate.errors));
    } else {
      next();
    }
  };
};

export { validateRequestBody };
