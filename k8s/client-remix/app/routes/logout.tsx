import type { ActionFunction, LoaderFunction } from "remix";
import { redirect } from "remix";

import { destroySession } from "~/utils/session.server";

export let action: ActionFunction = async ({ request }) =>
  destroySession(request);
export let loader: LoaderFunction = async () => redirect("/");
