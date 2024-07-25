// @ts-check
import nconf from "nconf";

import { withGracefulShutdown, handleShutdown } from "./utils/index.mjs";

import { app } from "./app.mjs";

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`))
);

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => handleShutdown(() => server.gracefulShutdown()))
);
