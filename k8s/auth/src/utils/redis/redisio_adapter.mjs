import Redis from "ioredis";

import { proto } from "./redis_proto.mjs";

/**
 * @param {import("ioredis").RedisOptions} config
 * @returns {Redis}
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

  var hget = async function (key, field) {
    return client.hget(key, field);
  };

  var hset = async function (key, object) {
    return client.hset(key, object);
  };

  return Object.assign(Object.create(proto), {
    get,
    set,
    setex,
    del,
    hget,
    hset,
  });
}

export { getRedisIoClient };
