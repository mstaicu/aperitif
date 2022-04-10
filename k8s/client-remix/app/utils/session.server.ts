import { createCookieSessionStorage } from "remix";

export { default as jsonwebtoken } from "jsonwebtoken";

if (!process.env.SESSION_JWT_SECRET) {
  throw new Error(
    "SESSION_JWT_SECRET must be defined as an environment variable"
  );
}

if (!process.env.SESSION_COOKIE_NAME) {
  throw new Error(
    "SESSION_COOKIE_NAME must be defined as an environment variable"
  );
}

if (!process.env.SESSION_COOKIE_SECRET) {
  throw new Error(
    "SESSION_COOKIE_SECRET must be defined as an environment variable"
  );
}

let storage = createCookieSessionStorage({
  cookie: {
    name: process.env.SESSION_COOKIE_NAME,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_COOKIE_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30m
    httpOnly: true,
  },
});

export const { getSession, commitSession, destroySession } = storage;
