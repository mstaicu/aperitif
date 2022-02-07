import { fetch } from "@remix-run/node";
import https from "https";
import { createCookieSessionStorage, redirect } from "remix";

type LoginForm = {
  email: string;
  password: string;
};

if (!process.env.SESSION_COOKIE_SECRET) {
  throw new Error(
    "SESSION_COOKIE_SECRET must be defined as an environment variable"
  );
}

if (!process.env.SESSION_COOKIE_NAME) {
  throw new Error(
    "SESSION_COOKIE_NAME must be defined as an environment variable"
  );
}

let storage = createCookieSessionStorage({
  cookie: {
    name: process.env.SESSION_COOKIE_NAME,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_COOKIE_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function createUserSession(userId: string, redirectTo: string) {
  let session = await storage.getSession();

  session.set("userId", userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function register({ email, password }: LoginForm) {
  try {
    const response = await fetch("https://traefik-lb-srv/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        /**
         * TODO: Add the domain (ticketing) to the env vars (?) and reference it in the Host header value
         */
        Host: "ticketing",
      },
      body: JSON.stringify({ email, password }),
      agent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === "production",
      }),
    });

    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function login({ email, password }: LoginForm) {
  try {
    const response = await fetch("https://traefik-lb-srv/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        /**
         * TODO: Add the domain (ticketing) to the env vars (?) and reference it in the Host header value
         */
        Host: "ticketing",
      },
      body: JSON.stringify({ email, password }),
      agent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === "production",
      }),
    });

    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function logout(request: Request) {
  let session = await getUserSession(request);

  return redirect("/jokes", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function getUser(request: Request) {
  let userId = await getUserId(request);

  if (typeof userId !== "string") {
    return null;
  }

  try {
    return {
      id: userId,
    };
  } catch {
    throw logout(request);
  }
}

export async function getUserId(request: Request) {
  let session = await getUserSession(request);

  let userId = session.get("userId");

  if (!userId || typeof userId !== "string") return null;

  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  let session = await getUserSession(request);

  let userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    let searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}
