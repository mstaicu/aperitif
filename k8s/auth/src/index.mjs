import dotenv from "dotenv";
import nconf from "nconf";

/**
 * 1. load .env file into process.env
 */

dotenv.config();

/**
 * 2. loads process.env into the hierarchy
 */
nconf.env();

// nconf.required([
//   "AUTH_EXPRESS_PORT",
//   "AUTH_MONGODB_URI",
//   "DOMAIN",
//   "ORIGIN",
// ]);

import("./server.mjs");
