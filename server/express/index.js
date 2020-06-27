import express from 'express';

import { env } from './config';
import loader from './loaders';

const startServer = async () => {
  const app = express();

  await loader(app);

  app.listen(env.port, err => {
    if (err) {
      process.exit(1);
    }

    console.log(`Running on port ${env.port}...`);
  });
};

startServer();
