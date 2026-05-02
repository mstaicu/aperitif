const identitiesApiUrl = (
  process.env.IDENTITIES_API_INTERNAL_URL ??
  "http://traefik-srv.traefik.svc.cluster.local/identities/v1"
).replace(/\/+$/, "");

export async function createRegistrationChallenge(request: Request) {
  const response = await fetch(
    `${identitiesApiUrl}/passkeys/register/challenge`,
    {
      method: "POST",
      signal: request.signal,
    },
  );

  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" },
    status: response.status,
  });
}

export async function finishRegistration(request: Request) {
  const response = await fetch(`${identitiesApiUrl}/passkeys/register`, {
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal: request.signal,
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
        "Set-Cookie":
          [
            `refresh_token=${encodeURIComponent(payload.refresh_token)}`,
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=2592000",
          ].join("; ") +
          (process.env.COOKIE_SECURE === "false" ? "" : "; Secure"),
      },
      status: response.status,
    },
  );
}

export async function createLoginChallenge(request: Request) {
  const response = await fetch(`${identitiesApiUrl}/passkeys/login/challenge`, {
    method: "POST",
    signal: request.signal,
  });

  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" },
    status: response.status,
  });
}

export async function finishLogin(request: Request) {
  const response = await fetch(`${identitiesApiUrl}/passkeys/login`, {
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal: request.signal,
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
        "Set-Cookie":
          [
            `refresh_token=${encodeURIComponent(payload.refresh_token)}`,
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=2592000",
          ].join("; ") +
          (process.env.COOKIE_SECURE === "false" ? "" : "; Secure"),
      },
      status: response.status,
    },
  );
}
