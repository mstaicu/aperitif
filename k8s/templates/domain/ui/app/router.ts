import { createRouter } from "remix/fetch-router";
import { staticFiles } from "remix/static-middleware";

import { homePage } from "./pages/home.ts";
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
