import { getServiceAvailabilityLayer } from "./availability.mjs";
import { getHealthzRoute, getReadyzRoute } from "./health.mjs";
import { getJwksRoute } from "./jwks.mjs";

export var layers = [
  getHealthzRoute,
  getReadyzRoute,
  getJwksRoute,
  getServiceAvailabilityLayer,
];
