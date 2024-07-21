import nconf from "nconf";
import { Redis } from "ioredis";

import { getRedisIoClient } from "./redisio_adapter.mjs";

var port = nconf.get("REDIS_PORT");
var host = nconf.get("REDIS_HOST");

/**
 * TODO: Add ENV var to switch between Redis clients if we need to migrate
 */
var clientType = "ioredis";

/**
 * @type {Redis}
 */
var redis;

if (clientType === "ioredis") {
  redis = getRedisIoClient({
    port,
    host,
  });
}

export { redis };
