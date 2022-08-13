import { createCookieSessionStorage, redirect } from "@remix-run/node";

import { verify } from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import { isAccessToken, isRefreshToken } from "@tartine/common";
import type { UserPayload } from "@tartine/common";

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
if (!process.env.ACCESS_TOKEN_SECRET) {
  throw new Error(
    "ACCESS_TOKEN_SECRET must be defined as an environment variable"
  );
}
if (!process.env.REFRESH_TOKEN_SECRET) {
  throw new Error(
    "REFRESH_TOKEN_SECRET must be defined as an environment variable"
  );
}

/*******************************************************************************
 * 1. It all starts with a "user session". A session is a fancy type of cookie
 * that references data either in the cookie directly or in some other storage
 * like a database (and the cookie holds value that can access the other
 * storage). In our case we're going to keep the data in the cookie itself since
 * we don't know what kind of database you've got.
 */
export let accesTokenSession = createCookieSessionStorage({
  cookie: {
    name: "tma_access",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    secrets: [process.env.SESSION_COOKIE_SECRET],
  },
});

export let refreshTokenSession = createCookieSessionStorage({
  cookie: {
    name: "tma_refresh",
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
  try {
    let accessToken = await getAccessToken(request);
    let refreshToken = await getRefreshToken(request);

    if (!accessToken) {
      throw new Error(
        "The provided session cookie does not contain an access token"
      );
    }
    if (!refreshToken) {
      throw new Error(
        "The provided session cookie does not contain a refresh token"
      );
    }

    let accessTokenPayload = verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET!
    );
    let refreshTokenPayload = verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    );

    if (!isAccessToken(accessTokenPayload)) {
      throw new Error("Access token does not contain the required metadata");
    }
    if (!isRefreshToken(refreshTokenPayload)) {
      throw new Error("Refresh token does not contain the required metadata");
    }

    return [accessTokenPayload, accessToken, refreshSession];
  } catch (err) {
    throw await logout(request);
  }
}

/**
 *
 */

export async function login(magicToken: string): Promise<Response> {
  /**
   * If the token exchange throws, the caller of this function is responsible for handling the error
   */

  let { accessToken, refreshToken } = await exchangeMagicToken(magicToken);

  /**
   *
   */

  let session = await accesTokenSession.getSession();
  session.set("accessToken", accessToken);

  let headers = new Headers({
    "Set-Cookie": await accesTokenSession.commitSession(session, {
      maxAge: getAccessTokenExpiration(accessToken),
    }),
  });

  session = await refreshTokenSession.getSession();
  session.set("refreshToken", refreshToken);

  headers.append(
    "Set-Cookie",
    await refreshTokenSession.commitSession(session, {
      maxAge: getRefreshTokenExpiration(refreshToken),
    })
  );

  /**
   * TODO: Add landing page back
   */

  return redirect("/user", {
    headers,
  });
}

export async function logout(request: Request): Promise<Response> {
  let cookie = request.headers.get("cookie");

  // TODO: Call /logout on the auth service to delete all refresh tokens

  let session = await accesTokenSession.getSession(cookie);

  let headers = new Headers({
    "auth-redirect": getReferrer(request),
    "Set-Cookie": await accesTokenSession.destroySession(session),
  });

  session = await refreshTokenSession.getSession(cookie);

  headers.append(
    "Set-Cookie",
    await refreshTokenSession.destroySession(session)
  );

  /**
   *
   */

  return redirect("/login", {
    status: 303,
    headers,
  });
}

async function refreshSession(request: Request): Promise<Headers> {
  try {
    let { accessToken, refreshToken } = await getFreshTokens(
      await getRefreshToken(request)
    );

    let session = await accesTokenSession.getSession();
    session.set("accessToken", accessToken);

    /**
     *
     */

    let responseHeaders = new Headers({
      "Set-Cookie": await accesTokenSession.commitSession(session, {
        maxAge: getAccessTokenExpiration(accessToken),
      }),
    });

    session = await refreshTokenSession.getSession();
    session.set("refreshToken", refreshToken);

    responseHeaders.append(
      "Set-Cookie",
      await refreshTokenSession.commitSession(session, {
        maxAge: getRefreshTokenExpiration(refreshToken),
      })
    );

    return responseHeaders;
  } catch (error) {
    throw await logout(request);
  }
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

export async function emailMagicToken(
  email: string,
  emailPayload: { landingPage: string }
): Promise<Response> {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
    body: JSON.stringify({ email, landingPage: emailPayload.landingPage }),
  });

  let payload = await response.json();

  if (response.ok) {
    return payload;
  }

  throw payload;
}

export async function exchangeMagicToken(
  token: string
): Promise<{ accessToken: string; refreshToken: string; landingPage: string }> {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
    body: JSON.stringify({ token }),
  });

  let payload = await response.json();

  if (response.ok) {
    return payload;
  }

  throw payload;
}

async function getFreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let response = await fetch("https://traefik-lb-srv/api/auth/token/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      "Content-Type": "application/json",
      Host: process.env.DOMAIN!,
    },
  });

  let payload = await response.json();

  if (response.ok) {
    return payload;
  }

  throw payload;
}

/**
 *
 */

export function getAccessTokenExpiration(accessToken: string): number {
  let { exp } = verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET!
  ) as JwtPayload;

  if (!exp) {
    return 0;
  }

  /**
   * Get the JsonWebToken's 'exp' expiration claim value, which is in seconds
   * Convert to milliseconds by multiplying with 1000
   */
  let expiresIn = new Date(exp * 1000);
  let expiresInSeconds = Math.trunc((expiresIn.getTime() - Date.now()) / 1000);

  return expiresInSeconds;
}

export function getRefreshTokenExpiration(refreshToken: string): number {
  let { exp } = verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as JwtPayload;

  if (!exp) {
    return 0;
  }

  /**
   * Get the JsonWebToken's 'exp' expiration claim value, which is in seconds
   * Convert to milliseconds by multiplying with 1000
   */
  let expiresIn = new Date(exp * 1000);
  let expiresInSeconds = Math.trunc((expiresIn.getTime() - Date.now()) / 1000);

  return expiresInSeconds;
}

export function getReferrer(request: Request): string {
  let referrer = request.referrer;

  if (referrer) {
    let { pathname, search } = new URL(referrer);
    return `${pathname}${search}`;
  }

  return "/";
}

async function getAccessToken(request: Request): Promise<string> {
  let cookie = request.headers.get("cookie");
  let { get } = await accesTokenSession.getSession(cookie);

  return get("accessToken");
}
async function getRefreshToken(request: Request): Promise<string> {
  let cookie = request.headers.get("cookie");
  let { get } = await refreshTokenSession.getSession(cookie);

  return get("refreshToken");
}
