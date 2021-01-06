import { ErrorObject } from 'ajv';

interface RequestValidationError extends Error {
  problemDetails: {
    invalid_params: ErrorObject[] | null;
    title: string;
    type: string;
  };
  statusCode: number;
}

export { RequestValidationError };
