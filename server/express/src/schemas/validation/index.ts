import { JSONSchema7 } from 'json-schema';

const signupPayload: JSONSchema7 = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      title: 'Email',
      type: 'string',
      description: 'Like a postal address but for computers.',
      format: 'email',
    },
    password: {
      title: 'Password',
      type: 'string',
      description: 'The keys to the kingdom.',
      minLength: 1,
    },
  },
};

const loginPayload: JSONSchema7 = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      title: 'Email',
      type: 'string',
      description: 'Like a postal address but for computers.',
      format: 'email',
    },
    password: {
      title: 'Password',
      type: 'string',
      description: 'The keys to the kingdom.',
      minLength: 1,
    },
  },
};

export { signupPayload, loginPayload };
