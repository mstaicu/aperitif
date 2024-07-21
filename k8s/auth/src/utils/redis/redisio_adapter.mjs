import Redis from "ioredis";

import { proto } from "./redis_proto.mjs";

/**
 * @param {import("ioredis").RedisOptions} config
 */
function getRedisIoClient(config = {}) {
  var client = new Redis(config);

  var get = async function (key) {
    return client.get(key);
  };

  var set = async function (key, value) {
    return client.set(key, value);
  };

  /**
   * @type {Redis}
   */
  var ioRedis = Object.create(proto);
  /**
   * This or add property descriptors to Object.create, more verbose
   */
  ioRedis.get = get;
  ioRedis.set = set;

  return ioRedis;
}

export { getRedisIoClient };
