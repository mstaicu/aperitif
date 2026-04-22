export const action = () =>
  fetch("http://traefik-srv.traefik/identities/v1/passkeys/login/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
