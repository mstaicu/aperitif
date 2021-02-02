import { createTerminus } from '@godaddy/terminus';
import stoppable from 'stoppable';

import app from './app';

const server = stoppable(
  app.listen(process.env.PORT, () => {
    console.log(`Express API running on port ${process.env.PORT}`);
  }),
);

const onSignal = async () => {
  console.log('Received SIGINT, gracefully terminating the instance');
  server.stop();
};

const onHealthCheck = () => Promise.resolve();

createTerminus(server, {
  healthChecks: {
    '/healthz': onHealthCheck,
  },
  signal: 'SIGINT',
  onSignal,
});
