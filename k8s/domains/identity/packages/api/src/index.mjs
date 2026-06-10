const requiredEnv = [
  "DATABASE_URL",
  "JWT_PRIVATE_KEY_PATH",
  "JWT_PUBLIC_KEY_PATH",
  "ACCESS_TOKEN_AUDIENCE",
  "ORIGIN",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const origin = process.env.ORIGIN;

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

await import("./server.mjs");
