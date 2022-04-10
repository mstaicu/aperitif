import {
  Form,
  json,
  redirect,
  useActionData,
  useSearchParams,
  useTransition,
} from "remix";
import { useEffect, useRef } from "react";

import type { ActionFunction, LinksFunction } from "remix";
import type { ProblemDetailsResponse } from "@tartine/common";

import { getSession, commitSession } from "~/utils/session.server";
import { authenticateUser } from "~/utils/login.server";

import loginStylesUrl from "~/styles/login.css";

/**
 *
 */
type ActionReturn = {
  values: {
    [key: string]: string;
  };
  errors: ProblemDetailsResponse;
};

/**
 *
 */
export let links: LinksFunction = () => [
  { rel: "stylesheet", href: loginStylesUrl },
];

export let action: ActionFunction = async ({ request }) => {
  let body = await request.formData();
  let response = await authenticateUser(body);

  let payload = await response.json();

  if (!response.ok) {
    let values = Object.fromEntries(body);
    return json({ values, errors: payload });
  }

  let session = await getSession();
  session.set("token", payload.token);

  return redirect(`${body.get("redirectTo")}`, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export default () => {
  let [searchParams] = useSearchParams();
  let transition = useTransition();

  let actionData = useActionData<ActionReturn>();

  let state: "idle" | "submitting" | "error" = transition.submission
    ? "submitting"
    : actionData?.errors
    ? "error"
    : "idle";

  let mounted = useRef<boolean>();

  let emailRef = useRef<HTMLInputElement>(null);
  let passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "error" && actionData?.errors.invalid_params?.email) {
      emailRef.current?.focus();
    }

    if (
      state === "error" &&
      actionData?.errors.invalid_params?.password &&
      !actionData?.errors.invalid_params?.email
    ) {
      passwordRef.current?.focus();
    }

    if (state === "idle" && mounted.current) {
      emailRef.current?.select();
    }

    mounted.current = true;
  }, [state]);

  return (
    <main>
      <Form replace method="post">
        <h2>Login or Register?</h2>

        <fieldset disabled={state === "submitting"}>
          <label>
            <input
              type="radio"
              name="loginType"
              value="login"
              defaultChecked={
                !actionData?.values.loginType ||
                actionData?.values.loginType === "login"
              }
            />
            Login
          </label>

          <label>
            <input
              type="radio"
              name="loginType"
              value="register"
              defaultChecked={actionData?.values.loginType === "register"}
            />
            Register
          </label>
        </fieldset>

        <fieldset disabled={state === "submitting"}>
          <input
            ref={emailRef}
            aria-label="Email address"
            aria-describedby="email-state"
            type="email"
            name="email"
            placeholder="Enter your email address"
          />
          <input
            ref={passwordRef}
            aria-label="Password field"
            aria-describedby="password-state"
            type="password"
            name="password"
            placeholder="Enter your password"
          />

          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? "/"}
          />

          <button>{state === "submitting" ? "Submitting" : "Submit"}</button>
        </fieldset>

        <p id="email-state">
          {state === "error" && actionData?.errors.invalid_params?.email ? (
            actionData?.errors.invalid_params?.email
          ) : (
            <>&nbsp;</>
          )}
        </p>

        <p id="password-state">
          {state === "error" && actionData?.errors.invalid_params?.password ? (
            actionData?.errors.invalid_params?.password
          ) : (
            <>&nbsp;</>
          )}
        </p>
      </Form>
    </main>
  );

  // return (
  //   <div className="container">
  //     <div className="content" data-light="">
  //       <h1>Login</h1>
  //       <form
  //         method="post"
  //         aria-describedby={
  //           actionData?.errors.title ? "form-error-message" : undefined
  //         }
  //       >
  // <input
  //   type="hidden"
  //   name="redirectTo"
  //   value={searchParams.get("redirectTo") ?? undefined}
  // />
  // <fieldset>
  //   <legend className="sr-only">Login or Register?</legend>
  //   <label>
  //     <input
  //       type="radio"
  //       name="loginType"
  //       value="login"
  //       defaultChecked={
  //         !actionData?.values.loginType ||
  //         actionData?.values.loginType === "login"
  //       }
  //     />{" "}
  //     Login
  //   </label>
  //   <label>
  //     <input
  //       type="radio"
  //       name="loginType"
  //       value="register"
  //       defaultChecked={actionData?.values.loginType === "register"}
  //     />{" "}
  //     Register
  //   </label>
  // </fieldset>
  //         <div>
  //           <label htmlFor="email-input">Email</label>
  //           <input
  //             type="text"
  //             id="email-input"
  //             name="email"
  //             defaultValue={actionData?.values.email}
  //             aria-invalid={Boolean(actionData?.errors.invalid_params!.email)}
  //             aria-describedby={
  //               actionData?.errors.invalid_params!.email
  //                 ? "email-error"
  //                 : undefined
  //             }
  //           />
  //           {actionData?.errors.invalid_params!.email ? (
  //             <p
  //               className="form-validation-error"
  //               role="alert"
  //               id="email-error"
  //             >
  //               {actionData?.errors.invalid_params!.email}
  //             </p>
  //           ) : null}
  //         </div>
  //         <div>
  //           <label htmlFor="password-input">Password</label>
  //           <input
  //             id="password-input"
  //             type="password"
  //             name="password"
  //             defaultValue={actionData?.values.password}
  //             aria-invalid={Boolean(
  //               actionData?.errors.invalid_params!.password
  //             )}
  //             aria-describedby={
  //               actionData?.errors.invalid_params!.password
  //                 ? "password-error"
  //                 : undefined
  //             }
  //           />
  //           {actionData?.errors.invalid_params!.password ? (
  //             <p
  //               className="form-validation-error"
  //               role="alert"
  //               id="password-error"
  //             >
  //               {actionData?.errors.invalid_params!.password}
  //             </p>
  //           ) : null}
  //         </div>
  //         <div id="form-error-message">
  //           {actionData?.errors.title ? (
  //             <p className="form-validation-error" role="alert">
  //               {actionData?.errors.title}
  //             </p>
  //           ) : null}
  //         </div>
  //         <button type="submit" className="button">
  //           Submit
  //         </button>
  //       </form>
  //     </div>
  //     <div className="links">
  //       <ul>
  //         <li>
  //           <Link to="/">Home</Link>
  //         </li>
  //         <li>
  //           <Link to="/jokes">Jokes</Link>
  //         </li>
  //       </ul>
  //     </div>
  //   </div>
  // );
};
