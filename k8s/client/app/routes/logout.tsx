import type { ActionFunction } from "@remix-run/node";

import { getLoginRedirect } from "~/utils/session.server";

export let action: ActionFunction = ({ request }) => getLoginRedirect(request);
