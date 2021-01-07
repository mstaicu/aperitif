import { ErrorObject } from 'ajv';

class CustomError extends Error {
  constructor(message: string) {
    super(message);

    /**
     * set error name as constructor name, make it not enumerable to keep native Error behavior
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target#new.target_in_constructors
     */
    Object.defineProperty(this, 'name', {
      value: new.target.name,
      enumerable: false,
      configurable: true,
    });

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    /**
     * fix the extended error prototype chain because typescript __extends implementation can't
     * @see https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class RequestAuthenticationError extends CustomError {
  statusCode: number;
  problemDetails: {
    status: number;
    title: string;
    type: string;
  };

  constructor() {
    super('Request authentication has failed.');

    this.statusCode = 403;
    this.problemDetails = {
      status: 403,
      title: "Request didn't pass authentication checks.",
      type: 'https://example-api.com/problem/invalid-credentials',
    };
  }
}

class RequestValidationError extends CustomError {
  statusCode: number;
  problemDetails: {
    invalid_params: ErrorObject[] | null | undefined;
    status: number;
    title: string;
    type: string;
  };

  constructor(invalidParams: ErrorObject[] | null | undefined) {
    super('Request validation has failed.');

    this.statusCode = 422;

    /**
     * @see https://tools.ietf.org/html/rfc7807#section-3
     */
    this.problemDetails = {
      invalid_params: invalidParams,
      status: 422,
      title: "Request body didn't pass the checks.",
      type: 'https://example-api.com/problem/invalid-request-body',
    };
  }
}

export { RequestAuthenticationError, RequestValidationError };
