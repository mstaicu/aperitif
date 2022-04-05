export type ProblemDetailsResponse = {
  title: string;
  detail?: string;
  status: number;
  invalid_params?: { param: string; reason: string }[];
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
  abstract serializeResponse(): ProblemDetailsResponse;
}
