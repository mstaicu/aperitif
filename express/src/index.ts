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
  /**
   * TODO: Check why the server is terminated before calling .terminate,
   * which yields a ERR_SERVER_NOT_RUNNING error
   *
   * https://github.com/gajus/http-terminator/blob/master/src/factories/createInternalHttpTerminator.js#L145
   */
  try {
    await serverTerminator.terminate();
  } catch (err) {
    console.log(err);
  }
};

createTerminus(server, {
  signal: 'SIGINT',
  onSignal,
});
