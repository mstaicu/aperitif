import { CustomError } from "./custom-error";

export class DatabaseConnectionError extends CustomError {
  statusCode = 500;

  constructor() {
    super("Database connection error");
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  serializeResponse = () => ({
    title: "Database connection error",
    detail:
      "Something went wrong while trying to connect to the services' database",
    status: this.statusCode,
  });
}
