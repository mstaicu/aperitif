export const action = () =>
  fetch("http://traefik-srv.traefik/auth/v1/passkeys/register/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
