// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { handleShutdown, withGracefulShutdown } from "./utils/index.mjs";

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`)),
);

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => handleShutdown(() => server.gracefulShutdown())),
);

export { server };
