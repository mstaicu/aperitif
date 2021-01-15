import { ErrorObject } from 'ajv';

interface RequestAuthenticationError extends Error {
  problemDetails: {
    status: number;
    title: string;
    type: string;
  };
  statusCode: number;
}

interface RequestValidationError extends Error {
  problemDetails: {
    invalid_params: ErrorObject[] | null | undefined;
    status: number;
    title: string;
    type: string;
  };
  statusCode: number;
}

export { RequestAuthenticationError, RequestValidationError };
