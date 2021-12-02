import { createCookieSessionStorage, redirect } from "remix";

type LoginForm = {
  username: string;
  password: string;
};

/**
 * username "kody" and the password "twixrox"
 */
export async function login({ username, password }: LoginForm) {
  /**
   * POST to /login then return the user details
   */
  return {
    id: "1dc45f54-4061-4d9e-8a6d-28d6df6a8d7f",
    createdAt: "2021-11-21T00:28:52.560Z",
    updatedAt: "2021-11-21T00:28:52.560Z",
    username: "kody",
    passwordHash:
      "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
  };
}

export async function register({ username, password }: LoginForm) {
  /**
   * POST to /register then return the user details
   */
  return {
    id: "1dc45f54-4061-4d9e-8a6d-28d6df6a8d7f",
    createdAt: "2021-11-21T00:28:52.560Z",
    updatedAt: "2021-11-21T00:28:52.560Z",
    username: "kody",
    passwordHash:
      "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
  };
}

// let sessionSecret = process.env.SESSION_SECRET;
let sessionSecret = "mama";

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

let storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secure: true,
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
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
    /**
     * TODO: Fetch user profile
     */

    return {
      id: "1dc45f54-4061-4d9e-8a6d-28d6df6a8d7f",
      createdAt: "2021-11-21T00:28:52.560Z",
      updatedAt: "2021-11-21T00:28:52.560Z",
      username: "kody",
      passwordHash:
        "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
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

export async function createUserSession(userId: string, redirectTo: string) {
  let session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
