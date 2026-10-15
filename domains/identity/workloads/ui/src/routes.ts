import type { AssetServer } from "remix/assets";
import type { Router } from "remix/router";

import { createCookie } from "remix/cookie";
import * as s from "remix/data-schema";
import { minLength } from "remix/data-schema/checks";

import { authPage } from "./page.ts";

const sessionCookie = createCookie("identity_session_token", {
  decode: decodeURIComponent,
  encode: encodeURIComponent,
  httpOnly: true,
  path: "/",
  sameSite: "Lax",
  secure: process.env.NODE_ENV === "production",
});

const session = s.object({
  expires_in: s
    .number()
    .refine((value) => Number.isSafeInteger(value) && value > 0),
  session_token: s.string().pipe(minLength(1)),
});

export default function registerRoutes(
  app: Router,
  { apiUrl, assets }: { apiUrl: string; assets: AssetServer },
) {
  for (const [page, ceremony] of [
    ["login", "authentication"],
    ["signup", "registration"],
  ] as const) {
    app.get(`/identity/${page}`, ({ request }) =>
      authPage(ceremony, returnTo(request), assets),
    );
    app.post(`/identity/${page}/options`, () =>
      fetch(`${apiUrl}/passkeys/${ceremony}/options`, { method: "POST" }),
    );
    app.post(`/identity/${page}`, async ({ request }) => {
      const redirectTo = returnTo(request);
      const response = await fetch(`${apiUrl}/passkeys/${ceremony}`, {
        body: await request.text(),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) return response;

      const { expires_in, session_token } = s.parse(
        session,
        await response.json(),
      );

      return Response.json(
        { ok: true, return_to: redirectTo },
        {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": await sessionCookie.serialize(session_token, {
              maxAge: expires_in,
            }),
          },
        },
      );
    });
  }

  app.post("/identity/logout", async ({ request }) => {
    const token = await sessionCookie.parse(request.headers.get("Cookie"));

    if (token) {
      try {
        const response = await fetch(`${apiUrl}/session`, {
          headers: { Authorization: `Bearer ${token}` },
          method: "DELETE",
        });

        if (response.status !== 204 && response.status !== 401) {
          throw new Error(`Session revocation failed: ${response.status}`);
        }
      } catch (error) {
        console.error(error);
        return new Response("Logout failed. Please try again.", {
          headers: { "Cache-Control": "no-store" },
          status: 503,
        });
      }
    }

    return new Response(null, {
      headers: {
        "Cache-Control": "no-store",
        Location: "/identity/login",
        "Set-Cookie": await sessionCookie.serialize("", { maxAge: 0 }),
      },
      status: 303,
    });
  });

  app.post("/identity/access-token", async ({ request }) => {
    const token = await sessionCookie.parse(request.headers.get("Cookie"));

    try {
      const response = await fetch(`${apiUrl}/session/access-tokens`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
        method: "POST",
      });
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");

      return new Response(response.body, { headers, status: response.status });
    } catch (error) {
      console.error(error);
      return new Response(
        "Unable to create an access token. Please try again.",
        {
          headers: { "Cache-Control": "no-store" },
          status: 503,
        },
      );
    }
  });
}

function returnTo(request: Request) {
  const requestUrl = new URL(request.url);
  const value = requestUrl.searchParams.get("return_to");

  if (!value?.startsWith("/")) return "/";

  try {
    const target = new URL(value, requestUrl);

    return target.origin === requestUrl.origin
      ? target.pathname + target.search + target.hash
      : "/";
  } catch {
    return "/";
  }
}
