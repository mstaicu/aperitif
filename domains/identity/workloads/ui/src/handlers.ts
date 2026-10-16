import type { AssetServer } from "remix/assets";

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

export function addPasskey(request: Request, apiUrl: string) {
  return apiRequest(request, apiUrl, "/passkeys/registration");
}

export function createAccount(request: Request, apiUrl: string) {
  return apiRequest(request, apiUrl, "/accounts");
}

export function listAccounts(request: Request, apiUrl: string) {
  return apiRequest(request, apiUrl, "/accounts");
}

export function listPasskeys(request: Request, apiUrl: string) {
  return apiRequest(request, apiUrl, "/passkeys");
}

export function login(request: Request, apiUrl: string) {
  return completeLogin(request, apiUrl, "authentication");
}

export function loginOptions(apiUrl: string) {
  return fetch(`${apiUrl}/passkeys/authentication/options`, { method: "POST" });
}

export function loginPage(request: Request, assets: AssetServer) {
  return authPage("authentication", returnTo(request), assets);
}

export async function logout(request: Request, apiUrl: string) {
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
}

export function passkeyOptions(request: Request, apiUrl: string) {
  return apiRequest(request, apiUrl, "/passkeys/registration/options");
}

export function removePasskey(request: Request, apiUrl: string, id: string) {
  return apiRequest(
    request,
    apiUrl,
    `/passkeys/${encodeURIComponent(id)}/delete`,
  );
}

export function renamePasskey(request: Request, apiUrl: string, id: string) {
  return apiRequest(request, apiUrl, `/passkeys/${encodeURIComponent(id)}`);
}

export function signup(request: Request, apiUrl: string) {
  return completeLogin(request, apiUrl, "registration");
}

export function signupOptions(apiUrl: string) {
  return fetch(`${apiUrl}/passkeys/registration/options`, { method: "POST" });
}

export function signupPage(request: Request, assets: AssetServer) {
  return authPage("registration", returnTo(request), assets);
}

async function apiRequest(request: Request, apiUrl: string, path: string) {
  const token = await sessionCookie.parse(request.headers.get("Cookie"));

  try {
    const exchange = await fetch(`${apiUrl}/session/access-tokens`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
      method: "POST",
    });

    if (!exchange.ok) {
      const headers = new Headers(exchange.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(exchange.body, { headers, status: exchange.status });
    }

    const { access_token } = s.parse(
      s.object({ access_token: s.string().pipe(minLength(1)) }),
      await exchange.json(),
    );
    const headers = new Headers({ Authorization: `Bearer ${access_token}` });
    const contentType = request.headers.get("Content-Type");

    if (contentType) headers.set("Content-Type", contentType);

    const response = await fetch(`${apiUrl}${path}`, {
      body: request.body ? await request.text() : undefined,
      headers,
      method: request.method,
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(response.body, {
      headers: responseHeaders,
      status: response.status,
    });
  } catch (error) {
    console.error(error);
    return new Response("Unable to complete the request. Please try again.", {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }
}

async function completeLogin(
  request: Request,
  apiUrl: string,
  ceremony: "authentication" | "registration",
) {
  const redirectTo = returnTo(request);
  const response = await fetch(`${apiUrl}/passkeys/${ceremony}`, {
    body: await request.text(),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) return response;

  const { expires_in, session_token } = s.parse(session, await response.json());

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
