import cors from 'cors';
import express from 'express';

import { problemDetails, tokenAuthentication } from './middleware';
import { usersRouter } from './routers';

import morgan = require('morgan');

const corsOptions = {
  origin: '*',
};
const logger = morgan(process.env.MORGAN_LEVEL);

const app = express();

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json());
app.use(logger);

app.use('/users', usersRouter);
app.use(tokenAuthentication);

app.use(problemDetails);

export default app;
