/**
 * As per examples in the mongoose repo
 *
 * examples/redis-todo/services/cache.js
 */

import mongoose from "mongoose";
import redis from "redis";

// TODO: .connect() ?
var client = redis.createClient("redis://127.0.0.1:6379");

/**
 * If we want to use the caching system, call .cache()
 * on the model before using it in a query
 *
 * This will set the useCache property only for that query
 *
 * @param {{key: string}} options
 * @returns {mongoose.Query}
 *
 * @description
 * 
 * Usage: await Users.findOne({_id: req.user.id}).cache({key: req.user.id});
 */
function cache(options = {}) {
  this.useCache = true;

  /**
   * Make sure the key is always a string
   */
  this.hashKey = JSON.stringify(options.key || "");

  return this;
}

var exec = mongoose.Query.prototype.exec;

/**
 * Wrap the mongoose query's exec function to make use of Redis as a cache
 *
 * @returns {mongoose.Query}
 */
async function monkeyPatchExec() {
  if (!this.useCache) {
    return await exec.apply(this, arguments);
  }

  var key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );

  /**
   * This is the JSON representation of a mongoose document
   *
   * We need to return a full mongoose document, which includes methods
   */
  // var cached = await client.get(key);

  /**
   * hget is for nested hashes
   */
  var cached = await client.hget(this.hashKey, key);

  if (cached) {
    /**
     * In order to return a full mongoose document, we need to use the this.model method
     * and pass in our cached document JSON representations
     *
     * The following two are equivalent
     *
     * new this.model(JSON.parse(cached))
     *
     * new User({
     *   firstName: ''
     * })
     */

    var cachedDoc = JSON.parse(cached);

    return Array.isArray(cachedDoc)
      ? cachedDoc.map((cacheDoc) => new this.model(cacheDoc))
      : new this.model(cachedDoc);
  }

  /**
   * This returns a mongoose document, which is an instance of a Model, which is
   * an object that contains data and methods
   */
  var document = await exec.apply(this, arguments);

  // client.set(key, JSON.stringify(document));
  client.hset(this.hashKey, key, JSON.stringify(document));

  return document;
}

mongoose.Query.prototype.cache = cache;
mongoose.Query.prototype.exec = monkeyPatchExec;

module.exports = {
  clearHash: function (hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
