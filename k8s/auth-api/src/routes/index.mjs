import { getServiceAvailabilityLayer } from "./availability.mjs";
import { getHealthzRoute, getReadyzRoute } from "./health.mjs";
import { getJwksRoute } from "./jwks.mjs";
import { postMagicLink, postMagicLinkVerification } from "./register.mjs";

export var routes = [
  getHealthzRoute,
  getReadyzRoute,
  getJwksRoute,
  getServiceAvailabilityLayer,
  postMagicLink,
  postMagicLinkVerification,
];
