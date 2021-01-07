import { createTerminus } from '@godaddy/terminus';
import { createHttpTerminator } from 'http-terminator';

import app from './app';

const server = app.listen(process.env.PORT, () => {
  console.log(`Express API running on port ${process.env.PORT}`);
});

const serverTerminator = createHttpTerminator({
  server,
});

const onSignal = async () => {
  console.log('Received SIGINT, gracefully terminating the instance');
  await serverTerminator.terminate();
};

const onHealthCheck = () => Promise.resolve();

createTerminus(server, {
  healthChecks: {
    '/healthz': onHealthCheck,
  },
  signal: 'SIGINT',
  onSignal,
});
