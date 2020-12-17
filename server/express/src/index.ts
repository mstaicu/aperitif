import app from './app';

// node by default doesn't handle SIGINT/SIGTERM
// Docker containers use SIGINT and SIGTERM to properly exit
//
// Signals also aren't handeled by npm:
// https://github.com/npm/npm/issues/4603
// https://github.com/npm/npm/pull/10868
// https://github.com/RisingStack/kubernetes-graceful-shutdown-example/blob/master/src/index.js
// if you want to use npm then start with `docker run --init` to help, but I still don't think it's
// a graceful shutdown of node process, just a forced exit

const server = app.listen(process.env.PORT, () => {
  console.log(`🏃🏻‍♂️ on port ${process.env.PORT}`);
});

const shutdown = () => {
  server.close(function onServerClosed(err) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
    }
    process.exit();
  });
};

process.on('SIGINT', function onSigint() {
  console.info(
    'Received SIGINT (aka Ctrl + C in Docker). Gracefully shutting down...',
    new Date().toISOString(),
  );
  shutdown();
});

process.on('SIGTERM', function onSigterm() {
  console.info(
    'Received SIGTERM (docker container stop). Gracefully shutting down...',
    new Date().toISOString(),
  );
  shutdown();
});
