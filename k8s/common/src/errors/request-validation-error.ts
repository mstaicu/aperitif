import { ValidationError } from "express-validator";

import { CustomError } from "./custom-error";

export class RequestValidationError extends CustomError {
  statusCode = 400;

  constructor(public errors: ValidationError[]) {
    super("Request payload did not pass validation checks");
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeResponse = () => ({
    title: "Bad request",
    detail: "Request payload did not pass validation checks",
    status: this.statusCode,
    invalid_params: this.errors.reduce(
      (initial, { param, msg }) => ({
        ...initial,
        [param]: { reason: msg },
      }),
      {}
    ),
  });
}
