import Redis from "ioredis";

import { proto } from "./redis_proto.mjs";

/**
 * @param {import("ioredis").RedisOptions} config
 */
function getRedisIoClient(config = {}) {
  /**
   * ioredis returns a promise if the last argument isn't a function
   */
  var client = new Redis(config);

  var get = async function (key) {
    return client.get(key);
  };

  var set = async function (key, value) {
    return client.set(key, value);
  };

  var setex = async function (key, seconds, value) {
    return client.setex(key, seconds, value);
  };

  var del = async function (key) {
    return client.del(key);
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
  ioRedis.setex = setex;
  ioRedis.del = del;

  return ioRedis;
}

export { getRedisIoClient };
