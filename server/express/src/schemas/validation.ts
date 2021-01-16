import type { Schema } from 'ajv';

const registerSchema: Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      errorMessage: {
        format: 'We need a valid email address. You sent us ${/email}',
      },
    },
    password: {
      type: 'string',
      minLength: 1,
      errorMessage: {
        minLength:
          'We need a valid password that has at least one character. You sent us ${/password}',
      },
    },
  },
};

const loginSchema: Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      errorMessage: {
        format: 'We need a valid email address. You sent us ${/email}',
      },
    },
    password: {
      type: 'string',
      minLength: 1,
      errorMessage: {
        minLength:
          'We need a valid password that has at least one character. You sent us ${/password}',
      },
    },
  },
};

export { registerSchema, loginSchema };
