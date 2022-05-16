import { Form, Link, useActionData, useLoaderData, useTransition } from "remix";

export {
  loginAction as action,
  loginLoader as loader,
} from "~/utils/auth.server";

import type { ProblemDetailsResponse } from "@tartine/common";
import { useEffect, useRef } from "react";

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
            aria-aria-label="Email address"
            aria-describedby="email-error-message"
            ref={inputRef}
            type="email"
            name="email"
            placeholder="you@are.rockstar"
          />

          <input
            type="hidden"
            name="landingPage"
            value={
              loaderData.ok === false && loaderData.landingPage
                ? loaderData.landingPage
                : "/"
            }
          />

          <p id="email-error-message">
            {state === "error" ? (
              actionData?.invalid_params?.email
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
