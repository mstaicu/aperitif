const requiredEnv = ["DATABASE_URL", "IDENTITY_JWKS_URL"];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

await import("./server.mjs");
