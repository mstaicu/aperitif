import Ajv from 'ajv';
import { Request, Response, NextFunction } from 'express';
import { JSONSchema7 } from 'json-schema';

import { RequestValidationError } from '../errors';

const ajv = new Ajv();

const validateRequestBody = (bodySchema: JSONSchema7) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const validate = ajv.compile(bodySchema);
  const isPayloadValid = validate(req.body);
  !isPayloadValid ? next(new RequestValidationError(validate.errors)) : next();
};

export { validateRequestBody };
