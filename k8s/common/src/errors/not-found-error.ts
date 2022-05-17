import { CustomError } from "./custom-error";

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor() {
    super("Could not find the requested resource");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeResponse = () => ({
    title: "Not found",
    detail: "Could not find the requested resource",
    status: this.statusCode,
  });
}
