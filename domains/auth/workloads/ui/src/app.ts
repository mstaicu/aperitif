import { fileURLToPath } from "node:url";

import { createAssetServer } from "remix/assets";
import { cop } from "remix/middleware/cop";
import { createRouter } from "remix/router";

import { postPasskey } from "./passkeys/api.ts";
import { passkeyPage } from "./passkeys/page.ts";

const isDevelopment = process.env.NODE_ENV === "development";

export const assets = createAssetServer({
  basePath: "/auth/assets",
  rootDir: fileURLToPath(new URL("../", import.meta.url)),
  mounts: {
    src: "src",
    node_modules: "node_modules",
  },
  allowFiles: ["src/public/**", "src/passkeys/public/**"],
  allowPackages: ["@simplewebauthn/browser"],
  sourceMaps: isDevelopment ? "external" : undefined,
  minify: !isDevelopment,
  watch: false,
});

export const router = createRouter({ middleware: [cop()] });

router.get("/auth/assets/*path", async ({ request }) => {
  return (
    (await assets.fetch(request)) ?? new Response("Not Found", { status: 404 })
  );
});
router.get("/livez", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));

router.get("/login", () => passkeyPage("authentication", assets));
router.post("/login/options", ({ request }) =>
  postPasskey(request, "authentication/options"),
);
router.post("/login", ({ request }) => postPasskey(request, "authentication"));

router.get("/signup", () => passkeyPage("registration", assets));
router.post("/signup/options", ({ request }) =>
  postPasskey(request, "registration/options"),
);
router.post("/signup", ({ request }) => postPasskey(request, "registration"));
