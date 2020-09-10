import express from 'express';

import { env } from './config';
import loader from './loaders';

const startServer = async () => {
  const app = express();

  await loader(app);

  const server = app.listen(env.port, err => {
    if (err) {
      process.exit(1);
    }

    console.log(`Running on port ${env.port}...`);
  });

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server');

    server.close(() => {
      console.info('HTTP server closed');

      // Close all connections to databases
    });
  });
};

startServer();
