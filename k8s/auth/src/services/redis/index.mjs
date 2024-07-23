import nconf from "nconf";
import { Redis } from "ioredis";

import { getRedisIoClient } from "./redisio_adapter.mjs";

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
    port: nconf.get("REDIS_PORT"),
    host: nconf.get("REDIS_HOST"),
    lazyConnect: true,
  });
}

export { redis };
