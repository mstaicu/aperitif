import { config } from 'dotenv';
import express from 'express';

import { handleProblemDetails, checkAuthentication } from './middlewares';
import { publicRouter, statusRouter } from './routers';

import morgan = require('morgan');

/**
 * path towards the environment file, which can be provided by:
 * 1. orchestrator (which provides the secrets from the raft distributed state store)
 * 2. locally
 */
config({ path: process.env.API_ENV_FILE });

const logger = morgan(process.env.MORGAN_LEVEL);

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(logger);

app.use(statusRouter);
app.use(publicRouter);
app.use(checkAuthentication);

app.use(handleProblemDetails);

export default app;
