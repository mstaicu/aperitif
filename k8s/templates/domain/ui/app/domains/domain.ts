export const domainApiUrl = (process.env.DOMAIN_API_INTERNAL_URL ?? "").replace(
  /\/+$/,
  "",
);
