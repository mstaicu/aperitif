import type { Route } from "./+types/register.account";

const UPSTREAM = "http://traefik-srv/auth/webauthn/registration";

export async function action({ request }: Route.ActionArgs) {
  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
