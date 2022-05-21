import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import type { JwtPayload } from "jsonwebtoken";
import type { LoaderFunction } from "@remix-run/node";
import type { SessionPayload } from "@tartine/common";

import { getAuthSession } from "~/utils/session.server";

type LoaderData = SessionPayload & JwtPayload;

export let loader: LoaderFunction = async ({ request }) => {
  let [payload] = await getAuthSession(request);

  return json({
    user: payload.user,
  });
};

export default () => {
  let { user } = useLoaderData<LoaderData>();

  return (
    <main>
      <h2>Welcome: {user.id}.</h2>
    </main>
  );
};
