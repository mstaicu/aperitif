import cors from 'cors';

/**
 * Can't use ES imports with morgan without getting a deprecation message
 */
const morgan = require('morgan');

export default async app => {
  /**
   * These options will be used to configure the cors middleware to add
   * these headers to the response:
   *
   * Access-Control-Allow-Origin: *
   * Vary: Origin
   *
   * Temporarily allow all requests
   */

  const corsOptions = {
    origin: '*',
  };

  /**
   * TODO: Setup better logging and reporting
   */
  const logger = morgan('tiny');

  app.use(cors(corsOptions));
  app.use(logger);

  return app;
};
