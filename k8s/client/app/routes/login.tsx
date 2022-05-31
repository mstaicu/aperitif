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

export {
  loginAction as action,
  loginLoader as loader,
} from "~/utils/session.server";

import type { ProblemDetailsResponse } from "@tartine/common";

/**
 *
 */
type ActionData = {
  ok: boolean;
} & Partial<ProblemDetailsResponse>;

type LoaderData = {
  ok: boolean;
  landingPage?: string;
} & Partial<ProblemDetailsResponse>;

/**
 *
 */
export default () => {
  let actionData = useActionData<ActionData>();
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
            value={loaderData.landingPage ?? "/secret"}
          />

          <p id="error-message">
            {state === "error" ? (
              actionData?.invalid_params?.email || actionData?.detail
            ) : (
              <>&nbsp;</>
            )}
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
