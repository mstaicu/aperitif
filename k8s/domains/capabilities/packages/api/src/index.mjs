const requiredEnv = [
  "DATABASE_URL",
  "IDENTITY_JWKS_URL",
  "ACCESS_TOKEN_AUDIENCE",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

await import("./server.mjs");
