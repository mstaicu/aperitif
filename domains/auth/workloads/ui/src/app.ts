import { fileURLToPath } from "node:url";

import { createAssetServer } from "remix/assets";
import { cop } from "remix/middleware/cop";
import { createRouter } from "remix/router";

import { completePasskey, logout, passkeyOptions } from "./auth.ts";
import { authPage } from "./page.ts";

export const assets = createAssetServer({
  basePath: "/auth/assets",
  rootDir: fileURLToPath(new URL("../", import.meta.url)),
  mounts: {
    src: "src",
    node_modules: "node_modules",
  },
  allowFiles: ["src/public/**"],
  allowPackages: ["@simplewebauthn/browser"],
  sourceMaps: process.env.NODE_ENV === "development" ? "external" : undefined,
  minify: process.env.NODE_ENV !== "development",
  watch: false,
});

export const router = createRouter({ middleware: [cop()] });

router.get(
  "/auth/assets/*path",
  async ({ request }) =>
    (await assets.fetch(request)) ?? new Response("Not Found", { status: 404 }),
);
router.get("/livez", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));

router.get("/login", ({ request }) =>
  authPage("authentication", returnTo(request), assets),
);
router.post("/login/options", () => passkeyOptions("authentication"));
router.post("/login", ({ request }) =>
  completePasskey(request, "authentication", returnTo(request)),
);

router.get("/signup", ({ request }) =>
  authPage("registration", returnTo(request), assets),
);
router.post("/signup/options", () => passkeyOptions("registration"));
router.post("/signup", ({ request }) =>
  completePasskey(request, "registration", returnTo(request)),
);

router.post("/logout", ({ request }) => logout(request));

function returnTo(request: Request) {
  const requestUrl = new URL(request.url);
  const value = requestUrl.searchParams.get("return_to");

  if (!value?.startsWith("/")) return "/";

  const target = new URL(value, requestUrl);

  return target.origin === requestUrl.origin
    ? target.pathname + target.search + target.hash
    : "/";
}
