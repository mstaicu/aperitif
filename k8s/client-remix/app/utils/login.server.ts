export let authenticateUser = async (body: FormData) => {
  let email = body.get("email");
  let password = body.get("password");

  let loginType = body.get("loginType");

  return fetch(`https://traefik-lb-srv/api/auth/${loginType}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      /**
       * TODO: Add domain env var
       */
      Host: "ticketing",
    },
    body: JSON.stringify({ email, password }),
  });
};
