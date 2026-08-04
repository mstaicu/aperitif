import type { RequestContext } from "remix/fetch-router";

if (!process.env.API_INTERNAL_V1_URL) {
  throw new Error("API_INTERNAL_V1_URL is required");
}

const apiInternalV1Url = process.env.API_INTERNAL_V1_URL.replace(/\/+$/, "");

export async function createRegistrationChallenge() {
  const response = await fetch(
    `${apiInternalV1Url}/passkeys/register/challenge`,
    {
      method: "POST",
    },
  );

  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" },
    status: response.status,
  });
}

export async function finishRegistration({ request }: RequestContext) {
  const response = await fetch(`${apiInternalV1Url}/passkeys/register`, {
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const payload = await response.json();

  if (!response.ok || typeof payload.refresh_token !== "string") {
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
      status: response.status,
    });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `refresh_token=${encodeURIComponent(payload.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`,
      },
      status: response.status,
    },
  );
}

export async function createLoginChallenge() {
  const response = await fetch(`${apiInternalV1Url}/passkeys/login/challenge`, {
    method: "POST",
  });

  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" },
    status: response.status,
  });
}

export async function finishLogin({ request }: RequestContext) {
  const response = await fetch(`${apiInternalV1Url}/passkeys/login`, {
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const payload = await response.json();

  if (!response.ok || typeof payload.refresh_token !== "string") {
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
      status: response.status,
    });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `refresh_token=${encodeURIComponent(payload.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`,
      },
      status: response.status,
    },
  );
}
