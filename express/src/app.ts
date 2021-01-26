import express from 'express';

import { handleProblemDetails, checkAuthentication } from './middlewares';
import { publicRouter } from './routers';

import morgan = require('morgan');

const logger = morgan(process.env.MORGAN_LEVEL);

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(logger);

app.use(publicRouter);
app.use(checkAuthentication);

app.use(handleProblemDetails);

export default app;
