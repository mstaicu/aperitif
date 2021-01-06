import { ValidationError } from 'express-json-validator-middleware';

export const problems = [
  {
    matchErrorClass: ValidationError,
    details: {
      type: 'https://example-api.com/problem/invalid-user-object',
      title: 'Invalid user object in request body',
      status: 422,
    },
    occurrenceDetails: ({ validationErrors }: ValidationError) => {
      return {
        invalid_params: validationErrors,
      };
    },
  },
];
