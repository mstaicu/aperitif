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

class RequestValidationError extends CustomError {
  constructor(invalidParams?: ErrorObject[] | null) {
    super('Request validation has failed.');

    /**
     * @see https://tools.ietf.org/html/rfc7807#section-3
     */

    // eslint-disable-next-line
    // @ts-ignore
    this.statusCode = 422;

    // eslint-disable-next-line
    // @ts-ignore
    this.problemDetails = {
      invalid_params: invalidParams,
      title: "Request didn't pass the checks.",
      type: 'https://example-api.com/problem/invalid-request',
    };
  }
}

export { RequestValidationError };
