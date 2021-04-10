import express from 'express';

// import { handleErrors, checkAuthentication } from './middlewares';
import { handleErrors } from './middlewares';
import { router } from './routers';

import morgan = require('morgan');

const logger = morgan(process.env.MORGAN_LEVEL!, {
  skip: () => process.env.NODE_ENV === 'test',
});

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(logger);

app.use(router);
// app.use(checkAuthentication);

app.use(handleErrors);

export { app };
