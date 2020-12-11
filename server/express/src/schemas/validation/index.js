const signupPayloadSchema = {
  $id: 'https://example.com/person.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SignupPayload',
  type: 'object',
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

const loginPayloadSchema = {
  $id: 'https://example.com/person.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SignupPayload',
  type: 'object',
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

export { signupPayloadSchema, loginPayloadSchema };
