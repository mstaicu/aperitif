import { createRouter } from "remix/fetch-router";
import { staticFiles } from "remix/static-middleware";

import { homePage } from "./pages/home.ts";
import { loginPage } from "./pages/login.ts";
import { registerPage } from "./pages/register.ts";
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

router.get(routes.home, () => homePage());
router.map(routes.register, registerPage);
router.map(routes.login, loginPage);
