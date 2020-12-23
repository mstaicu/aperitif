import { createTerminus } from '@godaddy/terminus';
import stoppable from 'stoppable';

import app from './app';

const server = stoppable(
  app.listen(process.env.PORT, () => {
    console.log(`Express API running on port ${process.env.PORT}`);
  }),
);

const onSignal = async () => {
  console.log('Received SIGTERM, shutting down the instance');

  // TODO: Stoppable has some issues with long polling connections
  server.stop(function onServerClosed(err, gracefully) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
    }

    if (gracefully) {
      console.log('Instance shut down gracefully');
    }

    process.exit();
  });
};

const onHealthCheck = () => Promise.resolve();

createTerminus(server, {
  healthChecks: {
    '/healthz': onHealthCheck,
  },
  signals: ['SIGINT', 'SIGTERM'],
  onSignal,
});
