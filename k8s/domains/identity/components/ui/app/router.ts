import { createRouter } from "remix/fetch-router";
import { staticFiles } from "remix/static-middleware";

import { homePage } from "./pages/home.ts";
import { loginPage } from "./pages/login.ts";
import { signupPage } from "./pages/signup.ts";
import { routes } from "./routes.ts";

export const router = createRouter({
  middleware: [
    staticFiles("./public", {
      cacheControl: "no-store, must-revalidate",
      etag: false,
      lastModified: false,
    }),
  ],
});

router.get("/livez", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));
router.get(routes.home, () => homePage());
router.map(routes.signup, signupPage);
router.map(routes.login, loginPage);
