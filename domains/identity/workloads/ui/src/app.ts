import { fileURLToPath } from "node:url";
import { createAssetServer } from "remix/assets";
import { cop } from "remix/middleware/cop";
import { createRouter } from "remix/router";

import { completePasskey, logout, passkeyOptions } from "./auth.ts";
import { authPage } from "./page.ts";

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

export const router = createRouter({ middleware: [cop()] });

router.get(
  "/identity/assets/*path",
  async ({ request }) =>
    (await assets.fetch(request)) ?? new Response("Not Found", { status: 404 }),
);
router.get("/livez", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));

router.get("/identity/login", ({ request }) =>
  authPage("authentication", returnTo(request), assets),
);
router.post("/identity/login/options", () => passkeyOptions("authentication"));
router.post("/identity/login", ({ request }) =>
  completePasskey(request, "authentication", returnTo(request)),
);

router.get("/identity/signup", ({ request }) =>
  authPage("registration", returnTo(request), assets),
);
router.post("/identity/signup/options", () => passkeyOptions("registration"));
router.post("/identity/signup", ({ request }) =>
  completePasskey(request, "registration", returnTo(request)),
);

router.post("/identity/logout", ({ request }) => logout(request));

function returnTo(request: Request) {
  const requestUrl = new URL(request.url);
  const value = requestUrl.searchParams.get("return_to");

  if (!value?.startsWith("/")) return "/";

  const target = new URL(value, requestUrl);

  return target.origin === requestUrl.origin
    ? target.pathname + target.search + target.hash
    : "/";
}
