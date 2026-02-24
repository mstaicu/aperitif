import type { Route } from "./+types/login.challenge";

export async function action(params: Route.ActionArgs) {
  const res = await fetch(
    "http://traefik-srv/auth/webauthn/authentication/challenge",
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );

  return await res.json();
}
