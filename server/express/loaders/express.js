import express from 'express';

import { publicRouter, emailRouter } from '../routers';

import { requireAuth, tokenAuth } from '../middleware';

import { getUserById } from '../services';

export default async app => {
  /**
   * Starting with express@4.16+ we got the built-in JSON body parser
   */
  app.use(express.json());

  /**
   * login and signup do not require proof of verification
   */
  app.use('/', publicRouter);

  /**
   * all subsequent routes require proof of verification
   */
  app.use(tokenAuth(getUserById));

  /**
   * resource routers
   */
  app.use('/email', requireAuth, emailRouter);

  return app;
};
