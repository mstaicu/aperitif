import { buildApp } from "./app.mjs";

const server = await buildApp();

await server.listen({
  host: "0.0.0.0",
  port: 3000,
});

export { server };
