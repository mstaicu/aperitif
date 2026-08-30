import * as http from "node:http";

import { createAssetServer } from "remix/assets";
import { createRequestListener } from "remix/node-fetch-server";
import { createRouter } from "remix/router";

import { loginPage } from "./pages/login.ts";
import { signupPage } from "./pages/signup.ts";
import { createPasskeyOptions, finishPasskey } from "./passkeys.ts";

const isDevelopment = process.env.NODE_ENV === "development";
const assets = createAssetServer({
  basePath: "/auth/assets",
  rootDir: process.cwd(),
  fileMap: {
    "src/*path": "src/*path",
    "node_modules/*path": "node_modules/*path",
  },
  allowFiles: ["src/pages/**/*.client.ts", "src/pages/**/*.css"],
  allowPackages: ["@simplewebauthn/browser"],
  sourceMaps: isDevelopment ? "external" : undefined,
  minify: !isDevelopment,
  watch: isDevelopment,
});
const [scriptHref, stylesHref] = await Promise.all([
  assets.getHref("src/pages/passkeys.client.ts"),
  assets.getHref("src/pages/styles.css"),
]);
const pageAssets = { scriptHref, stylesHref };
const router = createRouter();

router.get("/auth/assets/*path", async ({ request }) => {
  return (
    (await assets.fetch(request)) ?? new Response("Not Found", { status: 404 })
  );
});
router.get("/livez", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));

router.get("/login", () => loginPage(pageAssets));
router.post("/login/options", () =>
  createPasskeyOptions("authentication"),
);
router.post("/login", ({ request }) =>
  finishPasskey(request, "authentication"),
);

router.get("/signup", () => signupPage(pageAssets));
router.post("/signup/options", () =>
  createPasskeyOptions("registration"),
);
router.post("/signup", ({ request }) =>
  finishPasskey(request, "registration"),
);

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const server = http.createServer(
  createRequestListener(async (request) => {
    try {
      return await router.fetch(request);
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error);
      }

      return new Response("Internal Server Error", { status: 500 });
    }
  }),
);

server.listen(port, () =>
  console.log(
    JSON.stringify({
      event: "server_started",
      level: "info",
      port,
      service: "auth-ui",
    }),
  ),
);

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;
  server.close();
}

["SIGINT", "SIGTERM"].forEach((signal) => process.once(signal, shutdown));
