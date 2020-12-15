import cors from 'cors';
import { Express } from 'express';

import morgan = require('morgan');

const generalLoader = async (app: Express) => {
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

export { generalLoader };
