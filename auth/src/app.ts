import express from 'express';

import { handleErrors, checkAuthentication } from './middlewares';
import { publicRouter } from './routers';

import morgan = require('morgan');

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(morgan(process.env.MORGAN_LEVEL!));

app.use(publicRouter);
app.use(checkAuthentication);

app.use(handleErrors);

export { app };
