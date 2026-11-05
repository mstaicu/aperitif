import { fileURLToPath } from "node:url";
import { createAssetServer } from "remix/assets";
import { cop } from "remix/middleware/cop";
import { createRouter } from "remix/router";

import * as handlers from "./handlers.ts";

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

app.get("/identity/login", ({ request }) =>
  handlers.loginPage(request, assets),
);
app.post("/identity/login/options", ({ request }) =>
  handlers.loginOptions(request, apiUrl),
);
app.post("/identity/login", ({ request }) => handlers.login(request, apiUrl));

app.get("/identity/signup", ({ request }) =>
  handlers.signupPage(request, assets),
);
app.post("/identity/signup/options", ({ request }) =>
  handlers.signupOptions(request, apiUrl),
);
app.post("/identity/signup", ({ request }) => handlers.signup(request, apiUrl));

app.post("/identity/logout", ({ request }) => handlers.logout(request, apiUrl));

app.get("/identity/accounts", ({ request }) =>
  handlers.listAccounts(request, apiUrl),
);
app.post("/identity/accounts", ({ request }) =>
  handlers.createAccount(request, apiUrl),
);

app.get("/identity/passkeys", ({ request }) =>
  handlers.listPasskeys(request, apiUrl),
);
app.post("/identity/passkeys/addition/options", ({ request }) =>
  handlers.createPasskeyAdditionOptions(request, apiUrl),
);
app.post("/identity/passkeys/addition", ({ request }) =>
  handlers.completePasskeyAddition(request, apiUrl),
);
app.post("/identity/passkeys/:id/removal", ({ params, request }) =>
  handlers.completePasskeyRemoval(request, apiUrl, params.id),
);

app.post("/identity/passkeys/:id/removal/options", ({ params, request }) =>
  handlers.createPasskeyRemovalOptions(request, apiUrl, params.id),
);
