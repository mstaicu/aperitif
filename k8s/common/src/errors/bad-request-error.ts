import { CustomError } from "./custom-error";

export class BadRequestError extends CustomError {
  statusCode = 400;

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeResponse = () => ({
    title: "Bad request",
    detail: this.message,
    status: this.statusCode,
  });
}
