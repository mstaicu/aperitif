export async function action() {
  return fetch("http://traefik-srv.traefik/auth/v1/passkeys/login/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}
