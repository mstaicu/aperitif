import { useEffect, useRef } from "react";
import {
  Form,
  Link,
  ThrownResponse,
  useCatch,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";

import type {
  ActionFunction,
  LinksFunction,
  LoaderFunction,
} from "@remix-run/node";
import type { ProblemDetailsResponse } from "@tartine/common";

import {
  authSession,
  /**
   *
   */
  exchangeMagicToken,
  emailMagicToken,
  /**
   *
   */
  getReferrer,
  getTokenExpiration,
} from "~/utils/session.server";

/**
 *
 */

import styles from "~/styles/login.css";

export let links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/**
 *
 */

type LoaderData = {
  landingPage?: string;
};

export let loader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url);
  let magicToken = searchParams.get("magic");

  if (typeof magicToken !== "string") {
    return json({ landingPage: getReferrer(request) });
  }

  /**
   * If the token exchange throws, render the catch boundary
   */
  let { jsonWebToken, landingPage } = await exchangeMagicToken(magicToken);

  let session = await authSession.getSession();
  session.set("jsonWebToken", jsonWebToken);

  return redirect(landingPage, {
    headers: {
      "Set-Cookie": await authSession.commitSession(session, {
        maxAge: getTokenExpiration(jsonWebToken),
      }),
    },
  });
};

/**
 *
 */

export let action: ActionFunction = async ({ request }) => {
  let { email, landingPage } = Object.fromEntries(
    new URLSearchParams(await request.text())
  );

  return await emailMagicToken(email, {
    landingPage,
  });
};

/**
 *
 */
export default async () => {
  let actionData = useActionData<Response>();
  let loaderData = useLoaderData<LoaderData>();
  let transition = useTransition();

  let inputRef = useRef<HTMLInputElement>(null);
  let successMessageRef = useRef<HTMLHeadingElement>(null);
  let isMounted = useRef<boolean>(false);

  let state: "success" | "error" | "idle" | "submitting" = transition.submission
    ? "submitting"
    : actionData?.ok === true
    ? "success"
    : actionData?.ok === false
    ? "error"
    : "idle";

  let errorResponse: ProblemDetailsResponse =
    state === "error" ? await actionData?.json() : null;
  let errorMessage =
    state === "error"
      ? errorResponse?.invalid_params?.email || errorResponse?.detail
      : null;

  useEffect(() => {
    if (state === "error") {
      inputRef.current?.focus();
    }

    if (state === "idle" && isMounted.current) {
      inputRef.current?.select();
    }

    if (state === "success") {
      successMessageRef.current?.focus();
    }

    isMounted.current = true;
  }, [state]);

  return (
    <main>
      {/* This form is shown ( un-hidden ) in an 'idle' or 'error' state */}
      <Form replace={true} method="post" aria-hidden={state === "success"}>
        <fieldset disabled={state === "submitting"}>
          <input
            aria-label="Email address"
            aria-describedby="error-message"
            ref={inputRef}
            type="email"
            name="email"
            placeholder="you@are.rockstar"
          />

          <input
            type="hidden"
            name="landingPage"
            value={loaderData.landingPage}
          />

          <p id="error-message">
            {state === "error" ? errorMessage : <>&nbsp;</>}
          </p>
        </fieldset>

        <button>{state === "submitting" ? "Sending..." : "Send"}</button>
      </Form>

      {/* This div is shown ( un-hidden ) in a 'success' state */}
      <div aria-hidden={state !== "success"}>
        <h2 ref={successMessageRef} tabIndex={-1}>
          Check your email inbox for the magic login link!
        </h2>
        <Link to=".">Wrong email?</Link>
      </div>
    </main>
  );
};

export function CatchBoundary() {
  const {
    data: { invalid_params, detail },
  } = useCatch<ThrownResponse<400, ProblemDetailsResponse>>();

  return (
    <main>
      <h2>
        Uh oh, something went wrong. {invalid_params?.magicToken || detail}
      </h2>
      <Link to=".">Try again?</Link>
    </main>
  );
}
