if (!process.env.API_INTERNAL_V1_URL) {
  throw new Error("API_INTERNAL_V1_URL is required");
}

const apiInternalV1Url = process.env.API_INTERNAL_V1_URL.replace(/\/+$/, "");

type PasskeyCeremony = "authentication" | "registration";

export async function createPasskeyOptions(ceremony: PasskeyCeremony) {
  const response = await fetch(
    `${apiInternalV1Url}/passkeys/${ceremony}/options`,
    {
      method: "POST",
    },
  );

  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" },
    status: response.status,
  });
}

export async function finishPasskey(
  request: Request,
  ceremony: PasskeyCeremony,
) {
  const response = await fetch(`${apiInternalV1Url}/passkeys/${ceremony}`, {
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json();

  if (!response.ok) {
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
      status: response.status,
    });
  }

  if (
    typeof payload.session_token !== "string" ||
    !Number.isInteger(payload.expires_in) ||
    payload.expires_in <= 0
  ) {
    throw new Error("Auth API returned an invalid session");
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `session_token=${encodeURIComponent(payload.session_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${payload.expires_in}; Secure`,
      },
      status: response.status,
    },
  );
}
