import express from 'express';

import { publicRouter, emailRouter } from '../routers';

import {
  tokenAuthentication,
  requireAuthentication,
  validationErrorHandler,
} from '../middleware';

export default async app => {
  app.disable('x-powered-by');

  /**
   * Starting with express@4.16+ we got the built-in JSON body parser
   *
   * If you’re using an older version of Express
   * you will need to install and configure the body-parser middleware package.
   *
   * If a request with a `Content-Type: application/json` header is
   * made to a route, this middleware will treat the request body as
   * a JSON string. It will attempt to parse it with `JSON.parse()`
   * and set the resulting object (or array) on a `body` property of
   * the request object, which you can access in your route handlers,
   * or other general middleware.
   */
  app.use(express.json());

  app.use('/', publicRouter);
  app.use(tokenAuthentication);
  app.use('/email', requireAuthentication, emailRouter);

  app.use(validationErrorHandler);

  return app;
};
