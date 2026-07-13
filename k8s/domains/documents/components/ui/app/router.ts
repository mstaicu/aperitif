import { createRouter } from "remix/fetch-router";

import { documentsPage } from "./pages/documents.ts";
import { routes } from "./routes.ts";

export const router = createRouter();

router.get("/healthz", () => new Response("ok"));
router.get("/readyz", () => new Response("ok"));
router.map(routes.documents, documentsPage);
