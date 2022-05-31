import { redirect } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

import { authSession } from "~/utils/session.server";

export let action: ActionFunction = async ({ request }) => {
  let session = await authSession.getSession(request.headers.get("Cookie"));

  throw redirect("/login", {
    headers: {
      "Set-Cookie": await authSession.destroySession(session),
    },
  });
};
export let loader: LoaderFunction = async () => redirect("/login");
