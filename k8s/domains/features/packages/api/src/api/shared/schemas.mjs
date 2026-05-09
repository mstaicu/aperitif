import { Type } from "@sinclair/typebox";

export const ErrorResponse = Type.Object(
  {
    status: Type.Integer({ maximum: 599, minimum: 400 }),
    title: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const ProblemResponse = {
  content: {
    "application/problem+json": {
      schema: ErrorResponse,
    },
  },
};
