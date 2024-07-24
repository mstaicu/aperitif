import nconf from "nconf";
import { Redis } from "ioredis";

import { getIoRedisClient } from "./ioredis_adapter.mjs";

/**
 * TODO: Add ENV var to switch between Redis clients if we need to migrate
 */
var clientType = "ioredis";

/**
 * @type {Redis}
 */
var redis;

if (clientType === "ioredis") {
  redis = getIoRedisClient({
    port: nconf.get("REDIS_PORT"),
    host: nconf.get("REDIS_HOST"),
    /**
     * This might not work for all use cases
     * If it doesn't, wrap the internal initialization in withRetry
     * and convert this to an async function
     */
    lazyConnect: true,
  });
}

export { redis };
