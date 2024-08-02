/**
 * Usage:
 * 
  import mongoose from "mongoose";
  import cacheMixin from "./cacheMixin.js";

  withRedisCache(redis, mongoose.Query.prototype);

  After that, any model can call .cache({ key: userId }); to enable caching
 */

function withRedisCache(client, o) {
  function cache(options = {}) {
    if (!options.key) {
      throw new Error("A cache key must be provided");
    }

    this.useCache = true;

    /**
     * Make sure the key is always a string
     */
    this.hashKey = JSON.stringify(options.key);

    /**
     * Return this for further method chaining
     */
    return this;
  }

  var exec = o.exec;

  async function patchedExec() {
    if (!this.useCache) {
      return await exec.apply(this, arguments);
    }

    var key = JSON.stringify(
      Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name,
      })
    );

    var cached = await client.hget(this.hashKey, key);

    if (cached) {
      var cachedDoc = JSON.parse(cached);

      return Array.isArray(cachedDoc)
        ? cachedDoc.map((doc) => new this.model(doc))
        : new this.model(cachedDoc);
    }

    var result = await exec.apply(this, arguments);

    await client.hset(this.hashKey, key, JSON.stringify(result));

    return result;
  }

  /**
   * We mutate the object in place, because we're not passing an empty object
   * as the first argument to Object.assign's call
   */
  return Object.assign(o, {
    cache,
    exec: patchedExec,
  });
}

export { withRedisCache };
