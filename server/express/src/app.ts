import cors from 'cors';
import express from 'express';

import {
  tokenAuthentication,
  validationErrorMiddleware,
  healthz,
} from './middleware';
import { usersRouter } from './routers';

import morgan = require('morgan');

const corsOptions = {
  origin: '*',
};

const app = express();

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(process.env.MORGAN_LEVEL));
app.use(healthz);

app.use('/users', usersRouter);
app.use(tokenAuthentication);

app.use(validationErrorMiddleware);

export default app;
