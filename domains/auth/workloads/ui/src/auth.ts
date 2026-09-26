import { createCookie } from "remix/cookie";
import * as s from "remix/data-schema";
import { minLength } from "remix/data-schema/checks";

const apiUrl = process.env.API_INTERNAL_V1_URL?.replace(/\/+$/, "");

if (!apiUrl) throw new Error("API_INTERNAL_V1_URL is required");

const sessionCookie = createCookie("session_token", {
  decode: decodeURIComponent,
  encode: encodeURIComponent,
  httpOnly: true,
  path: "/",
  sameSite: "Lax",
  secure: true,
});

const session = s.object({
  session_token: s.string().pipe(minLength(1)),
  expires_in: s
    .number()
    .refine((value) => Number.isSafeInteger(value) && value > 0),
});

export function passkeyOptions(ceremony: "authentication" | "registration") {
  return fetch(`${apiUrl}/passkeys/${ceremony}/options`, { method: "POST" });
}

export async function completePasskey(
  request: Request,
  ceremony: "authentication" | "registration",
  returnTo: string,
) {
  const response = await fetch(`${apiUrl}/passkeys/${ceremony}`, {
    body: await request.text(),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) return response;

  const { session_token, expires_in } = s.parse(session, await response.json());

  return Response.json(
    { ok: true, return_to: returnTo },
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

export async function logout(request: Request) {
  const token = await sessionCookie.parse(request.headers.get("Cookie"));

  if (token) {
    try {
      await fetch(`${apiUrl}/session`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "DELETE",
      });
    } catch (error) {
      console.error(error);
    }
  }

  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
      Location: "/login",
      "Set-Cookie": await sessionCookie.serialize("", { maxAge: 0 }),
    },
    status: 303,
  });
}
