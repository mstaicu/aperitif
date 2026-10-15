import { fileURLToPath } from "node:url";
import { createAssetServer } from "remix/assets";
import { cop } from "remix/middleware/cop";
import { createRouter } from "remix/router";

import registerRoutes from "./routes.ts";

const apiUrl = process.env.API_INTERNAL_V1_URL?.replace(/\/+$/, "");

if (!apiUrl) throw new Error("API_INTERNAL_V1_URL is required");

export const assets = createAssetServer({
  allowFiles: ["src/public/**"],
  allowPackages: ["@simplewebauthn/browser"],
  basePath: "/identity/assets",
  minify: process.env.NODE_ENV !== "development",
  mounts: {
    node_modules: "node_modules",
    src: "src",
  },
  rootDir: fileURLToPath(new URL("../", import.meta.url)),
  sourceMaps: process.env.NODE_ENV === "development" ? "external" : undefined,
  watch: false,
});

export const app = createRouter({ middleware: [cop()] });

app.get(
  "/identity/assets/*path",
  async ({ request }) =>
    (await assets.fetch(request)) ?? new Response("Not Found", { status: 404 }),
);
app.get("/livez", () => new Response("ok"));
app.get("/readyz", () => new Response("ok"));

registerRoutes(app, { apiUrl, assets });
