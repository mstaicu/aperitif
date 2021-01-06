import { JSONSchema7 } from 'json-schema';

const signupSchema: JSONSchema7 = {
  title: 'Signup request payload',
  description: 'Values required to open an account.',
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      // format: 'email',
      description: 'User account email address.',
    },
    password: {
      type: 'string',
      minLength: 1,
      description: 'Keys to the kingdom.',
    },
  },
};

const loginSchema: JSONSchema7 = {
  title: 'Login request payload',
  description: 'Values required to login.',
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      // format: 'email',
      description: 'User account email address.',
    },
    password: {
      type: 'string',
      minLength: 1,
      description: 'Keys to the kingdom.',
    },
  },
};

export { signupSchema, loginSchema };
