['NODE_ENV', 'PORT', 'MORGAN_LEVEL', 'SIGNATURE'].forEach(envVariable => {
  if (!process.env[envVariable]) {
    throw new Error(`Environment variable ${envVariable} is not defined`);
  }
});

require('./server');
