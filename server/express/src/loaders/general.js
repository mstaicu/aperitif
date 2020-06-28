/**
 * Can't use ES imports with morgan without getting a deprecation message
 */
const morgan = require('morgan');

import compression from 'compression';

export default async app => {
  let logger = morgan('tiny');

  /**
   * Register middlewares
   */
  app.use(compression());
  app.use(logger);

  return app;
};
