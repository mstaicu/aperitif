import type { Route } from "./+types/login.authenticate";

export async function action({ request }: Route.ActionArgs) {
  const res = await fetch("http://traefik-srv/auth/webauthn/authentication", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
  });

  if (!res.ok) {
    console.log("not ok");
  }

  const { refresh_token } = await res.json();

  console.log(refresh_token);
}
