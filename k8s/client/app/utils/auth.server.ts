import { createCookieSessionStorage, json, redirect } from "remix";
import type { ActionFunction, LoaderFunction } from "remix";

import { verify } from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import { isTokenPayload } from "@tartine/common";
import type { TokenPayload, ProblemDetailsResponse } from "@tartine/common";

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

let sessionMaxAge = /* seconds */ 60 * /* minutes */ 30; // 30m

/*******************************************************************************
 * 1. It all starts with a "user session". A session is a fancy type of cookie
 * that references data either in the cookie directly or in some other storage
 * like a database (and the cookie holds value that can access the other
 * storage). In our case we're going to keep the data in the cookie itself since
 * we don't know what kind of database you've got.
 */
export let authSession = createCookieSessionStorage({
  cookie: {
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_COOKIE_SECRET],
    path: "/",
    sameSite: "lax",
    httpOnly: true,
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
): Promise<[TokenPayload & JwtPayload, string, () => Promise<Headers>]> {
  let cookie = request.headers.get("cookie");
  let session = await authSession.getSession(cookie);

  if (!session.has("token")) {
    throw redirect("/login", {
      status: 303,
      headers: {
        "auth-redirect": getReferrer(request),
      },
    });
  }

  let refresh = async () =>
    new Headers({
      "Set-Cookie": await authSession.commitSession(session, {
        maxAge: sessionMaxAge,
      }),
    });

  return [await getJwtPayload(request), session.get("token"), refresh];
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
 * You might also do some work with your database here, like create a user
 * record.
 *
 * Now go up to (6)
 */

export let loginLoader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url);
  let magicToken = searchParams.get("magic");

  /*******************************************************************************
   * 'magic' query string parameter is not present, render the login page
   */
  if (typeof magicToken !== "string") {
    return json({ ok: false, landingPage: getReferrer(request) });
  }

  /*******************************************************************************
   * 'magic' query string parameter present, validate the magic token, redirect
   */
  let response = await fetch(
    "https://traefik-lb-srv/api/auth/validate-magic-token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: process.env.DOMAIN!,
      },
      body: JSON.stringify({ magicToken }),
    }
  );

  if (response.ok) {
    let { token, landingPage } = await response.json();

    let session = await authSession.getSession();
    session.set("token", token);

    return redirect(landingPage, {
      headers: {
        "Set-Cookie": await authSession.commitSession(session, {
          maxAge: sessionMaxAge,
        }),
      },
    });
  }

  /*******************************************************************************
   * Render the catch boundary in place of the render component of the login page
   */
  let details: ProblemDetailsResponse = await response.json();
  throw json(details, { status: details.status });
};

/*******************************************************************************
 * 4. After the user submits the form with their email address, we read the POST
 * body from the request, validate it, send the email, and finally render the
 * same route again but this time with action data. The UI then tells them to
 * check their email.
 *
 * No go back up to (5)
 */
export let loginAction: ActionFunction = async ({ request }) => {
  let response = await fetch(
    "https://traefik-lb-srv/api/auth/send-magic-link",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: process.env.DOMAIN!,
      },
      body: JSON.stringify(
        Object.fromEntries(new URLSearchParams(await request.text()))
      ),
    }
  );

  if (!response.ok) {
    let details: ProblemDetailsResponse = await response.json();
    return json({ ok: false, ...details });
  }

  return json({ ok: true });
};

function getReferrer(request: Request) {
  /*******************************************************************************
   * This doesn't work with all remix adapters yet, so pick a good default
   */
  let referrer = request.referrer;

  if (referrer) {
    let url = new URL(referrer);
    return url.pathname + url.search;
  }

  return "/";
}

async function getJwtPayload(request: Request): Promise<TokenPayload> {
  let cookie = request.headers.get("cookie");
  let session = await authSession.getSession(cookie);

  try {
    let payload = verify(
      session.get("token"),
      process.env.SESSION_JWT_SECRET!
    ) as JwtPayload & TokenPayload;

    if (!isTokenPayload(payload)) {
      throw new Error(
        "Authorization payload contains incorrect or incomplete data"
      );
    }

    return payload;
  } catch (error) {
    throw redirect("/login", {
      status: 303,
      headers: {
        "auth-redirect": getReferrer(request),
        "Set-Cookie": await authSession.destroySession(session),
      },
    });
  }
}
