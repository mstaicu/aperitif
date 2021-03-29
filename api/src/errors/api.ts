import type { ErrorObject } from 'ajv';

type FormattedInvalidParam = {
  name: string;
  reason?: string;
};

export abstract class CustomError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  /**
   * For more info on the type of the error response:
   * 
   * https://tools.ietf.org/html/rfc7807
   */
  abstract serializeResponse(): {
    type: string;
    title: string;
    status: number;
    invalid_params?: FormattedInvalidParam[];
  };
}

export class RequestAuthenticationError extends CustomError {
  statusCode = 403;

  constructor() {
    super("Request didn't pass authentication checks");
  }

  serializeResponse = () => ({
    type: 'https://example-api.com/problem/invalid-credentials',
    title: "Request didn't pass authentication checks",
    status: this.statusCode,
  });
}

export class RequestAuthorizationError extends CustomError {
  statusCode = 401;

  constructor() {
    super("Request didn't pass authorization checks");
  }

  serializeResponse = () => ({
    type: 'https://example-api.com/problem/invalid-authorization',
    title: "Request didn't pass authorization checks",
    status: this.statusCode,
  });
}

export class RequestValidationError extends CustomError {
  statusCode = 422;

  /**
   * Using ajv as a validator against a JSON Schema
   * The results of the validation are passed as an argument
   */
  constructor(public errors: ErrorObject[] | null | undefined) {
    super("Request payload didn't pass the checks");
  }

  serializeResponse = () => ({
    type: 'https://example-api.com/problem/invalid-request-payload',
    title: "Request payload didn't pass the checks",
    status: this.statusCode,
    invalid_params: (this.errors || []).reduce<FormattedInvalidParam[]>(
      (invalidParams, { dataPath, message }) => [
        ...invalidParams,
        { name: dataPath.slice(1), reason: message },
      ],
      [],
    ),
  });
}

export class ExistingEmailError extends CustomError {
  statusCode = 200;

  constructor() {
    super("Email address is not available");
  }

  serializeResponse = () => ({
    type: 'https://example-api.com/problem/email-not-available',
    title: "Email address is not available",
    status: this.statusCode,
  });
}

export class NonExistingEmailError extends CustomError {
  statusCode = 404;

  constructor() {
    super("Email address is not registered");
  }

  serializeResponse = () => ({
    type: 'https://example-api.com/problem/email-not-registered',
    title: "Email address is not registered",
    status: this.statusCode,
  });
}