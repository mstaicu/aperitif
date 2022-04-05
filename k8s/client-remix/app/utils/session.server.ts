import { createCookieSessionStorage, redirect } from "remix";

let storage = createCookieSessionStorage({
  cookie: {
    name: process.env.SESSION_COOKIE_NAME,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_COOKIE_SECRET!],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export async function createSession(
  authenticationResponse: any,
  redirectTo: string = "/"
) {
  let session = await storage.getSession();

  let { id } = authenticationResponse;

  session.set("userId", id);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function destroySession(
  request: Request,
  redirectTo: string = "/"
) {
  let session = await storage.getSession(request.headers.get("Cookie"));

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}
