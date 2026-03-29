export async function action() {
  const upstream = await fetch(
    "http://traefik-srv.traefik/auth/v1/passkeys/login/challenge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
