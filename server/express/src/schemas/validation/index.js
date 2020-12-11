const signupSchema = {
  type: 'object',
  properties: {
    email: {
      title: 'Email',
      description: 'Like a postal address but for computers.',
      type: 'string',
      format: 'email',
    },
    password: {
      title: 'Password',
      description: 'The keys to the kingdom.',
      type: 'string',
      minLength: 1,
    },
  },
  required: ['email', 'password'],
};

const loginSchema = {
  type: 'object',
  properties: {
    email: {
      title: 'Email',
      description: 'Like a postal address but for computers.',
      type: 'string',
      format: 'email',
    },
    password: {
      title: 'Password',
      description: 'The keys to the kingdom.',
      type: 'string',
      minLength: 1,
    },
  },
  required: ['email', 'password'],
};

export { signupSchema, loginSchema };
