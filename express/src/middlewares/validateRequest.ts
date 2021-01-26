import type { Schema, ErrorObject } from 'ajv';
import type { Request, Response, NextFunction } from 'express';

import type { InvalidParam } from '../errors';
import { ValidationError } from '../errors';
import { ajv } from '../services/validation';

const formatErrors = (errors: ErrorObject[] | null | undefined) =>
  (errors || []).reduce<InvalidParam[]>(
    (formattedErrors, { dataPath, message }) => [
      ...formattedErrors,
      { name: dataPath.slice(1), reason: message },
    ],
    [],
  );

const validateRequestBody = (bodySchema: Schema) => {
  const validate = ajv.compile(bodySchema);
  return (req: Request, _: Response, next: NextFunction) => {
    if (!validate(req.body)) {
      next(
        new ValidationError({
          invalid_params: formatErrors(validate.errors),
        }),
      );
    } else {
      next();
    }
  };
};

export { validateRequestBody };
