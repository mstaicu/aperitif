import { ValidationError } from 'express-json-validator-middleware';

export const ProblemTypes = [
  {
    matchErrorClass: ValidationError,
    details: {
      type: 'https://example-api.com/problem/invalid-request',
      title: "Request didn't pass the checks.",
      status: 422,
    },
    occurrenceDetails: ({ validationErrors: { body } }: ValidationError) => ({
      // TODO: Write a custom middleware that exposes human readable AJV formatted errors
      invalid_params: body,
    }),
  },
];

export const DefaultProblemType = {
  details: {
    type: 'about:blank',
    status: 500,
  },
  occurrenceDetails: () => ({}),
};
