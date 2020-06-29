/**
 * Can't use ES imports with morgan without getting a deprecation message
 */
const morgan = require('morgan');

export default async app => {
  let logger = morgan('tiny');

  app.use(logger);

  return app;
};
