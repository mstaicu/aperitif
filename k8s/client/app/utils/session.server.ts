import { createCookieSessionStorage, json, redirect } from "@remix-run/node";

import { verify } from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import { isSessionPayload } from "@tartine/common";
import type { UserPayload, ProblemDetailsResponse } from "@tartine/common";

/*******************************************************************************
 * Before we can do anything, we need to make sure the environment has
 * everything we need. If anything is missing, we just prevent the app from
 * starting up.
 *******************************************************************************
 */

if (!process.env.DOMAIN) {
  throw new Error("DOMAIN must be defined as an environment variable");
}

if (!process.env.SESSION_COOKIE_SECRET) {
  throw new Error(
    "SESSION_COOKIE_SECRET must be defined as an environment variable"
  );
}
if (!process.env.SESSION_JWT_SECRET) {
  throw new Error(
    "SESSION_JWT_SECRET must be defined as an environment variable"
  );
}

/*******************************************************************************
 * 1. It all starts with a "user session". A session is a fancy type of cookie
 * that references data either in the cookie directly or in some other storage
 * like a database (and the cookie holds value that can access the other
 * storage). In our case we're going to keep the data in the cookie itself since
 * we don't know what kind of database you've got.
 */
export let authSession = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    secrets: [process.env.SESSION_COOKIE_SECRET],
  },
});

/*******************************************************************************
 * 2. The whole point of authentication is to make sure we have a valid user
 * before showing them some pages. This function protects pages from
 * unauthenticated users. You call this from any loader/action that needs
 * authentication.
 *
 * This function will return the user session (with a way to refresh it, we'll
 * talk about that when you get to (7)). If there isn't a session, it redirects
 * to the "/login" route by throwing a redirect response.
 *
 * Because you can `throw` a response in Remix, your loaders and actions don't
 * have to worry about doing the redirects themselves. Code in the loader will
 * stop executing and this function peforms a redirect right here.
 *
 * 6. All future requests to loaders/actions that require a user session will
 * call this function and they'll get the session instead of a login redirect.
 * Sessions are stored with cookies which have a "max age" value. This is how
 * long you want the browser to hang on to the cookie. The `refresh` function
 * allows loaders and actions to "refresh" the max age so it's always "since the
 * user last used it". If we didn't refresh, then sessions would always expire
 * even if the user is on your site every day.
 */

export async function getAuthSession(
  request: Request
): Promise<
  [JwtPayload & UserPayload, string, (request: Request) => Promise<Headers>]
> {
  let jsonWebToken = await getJsonWebToken(request);

  if (!jsonWebToken) {
    throw await getLoginRedirect(request);
  }

  let jsonWebTokenPayload = await getJsonWebTokenPayload(request);

  if (!isSessionPayload(jsonWebTokenPayload)) {
    throw await getLoginRedirect(request);
  }

  return [jsonWebTokenPayload, jsonWebToken, refreshSession];
}

/*******************************************************************************
 * 3. The user is redirected to this loader from `getAuthSession` if they haven't
 * logged in yet. This loader is also used to validate tokens, but right now there
 * isn't a token so it just renders the route with a "referrer" so the token can
 * log them into the right page later. We'll be back here soon for that part.
 *
 * Now go to (4)
 *
 * 5. After the user clicks the link in their email we end up here again, but
 * this time we have a token in the URL. If it's valid, we set the JWT as the "token"
 * in the session as we redirect to the landing page. We've got a user session!
 *
 * Now go up to (6)
 */

/*******************************************************************************
 * 4. After the user submits the form with their email address, we read the POST
 * body from the request, validate it, send the email, and finally render the
 * same route again but this time with action data. The UI then tells them to
 * check their email.
 *
 * No go back up to (5)
 */

/**
 * TODO: Use typed return types for express endpoints as well
 */
type ExchangeMagicToken = (
  token: string
) => Promise<{ jsonWebToken: string; landingPage: string }>;

export let exchangeMagicToken: ExchangeMagicToken = async (token) => {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
    body: JSON.stringify({ token }),
  });

  if (response.ok) {
    return await response.json();
  }

  let details: ProblemDetailsResponse = await response.json();
  throw json(details, { status: details.status });
};

/**
 * TODO: Use typed return types for express endpoints as well
 */
type RefreshJsonWebToken = (
  jsonWebToken: string
) => Promise<{ jsonWebToken: string }>;

let refreshJsonWebToken: RefreshJsonWebToken = async (jsonWebToken) => {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/extend", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jsonWebToken}`,
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
  });

  if (response.ok) {
    return await response.json();
  }

  let details: ProblemDetailsResponse = await response.json();
  throw json(details, { status: details.status });
};

export let emailMagicToken = async (email: string, landingPage: string) => {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
    body: JSON.stringify({ email, landingPage }),
  });

  if (response.ok) {
    return await response.json();
  }

  let details: ProblemDetailsResponse = await response.json();
  throw json(details, { status: details.status });
};

async function refreshSession(request: Request): Promise<Headers> {
  try {
    let { jsonWebToken } = await refreshJsonWebToken(
      await getJsonWebToken(request)
    );

    let cookie = request.headers.get("cookie");
    let session = await authSession.getSession(cookie);

    return new Headers({
      "Set-Cookie": await authSession.commitSession(session, {
        maxAge: getTokenExpiration(jsonWebToken),
      }),
    });
  } catch (err) {
    throw await getLoginRedirect(request);
  }
}

/**
 *
 */

export function getTokenExpiration(jsonWebToken: string) {
  let { exp } = verifyJsonWebToken(jsonWebToken);

  /**
   * Get the JsonWebToken's 'exp' expiration claim value, which is in seconds
   * Convert to milliseconds by multiplying with 1000
   */
  let expiresIn = new Date(exp! * 1000);
  let expiresInSeconds = Math.trunc((expiresIn.getTime() - Date.now()) / 1000);

  return expiresInSeconds;
}

export async function getLoginRedirect(request: Request) {
  let cookie = request.headers.get("cookie");
  let session = await authSession.getSession(cookie);

  return redirect("/login", {
    status: 303,
    headers: {
      "auth-redirect": getReferrer(request),
      "Set-Cookie": await authSession.destroySession(session),
    },
  });
}

export function getReferrer(request: Request) {
  /*******************************************************************************
   * This doesn't work with all remix adapters yet, so pick a good default
   *******************************************************************************
   */
  let referrer = request.referrer;

  if (referrer) {
    let { pathname, search } = new URL(referrer);
    return `${pathname}${search}`;
  }

  return "/";
}

async function getJsonWebToken(request: Request) {
  let cookie = request.headers.get("cookie");
  let { get } = await authSession.getSession(cookie);

  return get("jsonWebToken");
}

async function getJsonWebTokenPayload(request: Request) {
  return verifyJsonWebToken(await getJsonWebToken(request));
}

function verifyJsonWebToken(jsonWebToken: string) {
  return verify(jsonWebToken, process.env.SESSION_JWT_SECRET!) as JwtPayload;
}
