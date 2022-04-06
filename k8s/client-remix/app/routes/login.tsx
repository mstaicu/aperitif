import { useActionData, useSearchParams, Link, redirect, json } from "remix";

import type { ActionFunction, LinksFunction } from "remix";
import type { ProblemDetailsResponse } from "@tartine/common";

import { getSession, commitSession } from "~/utils/session.server";
import { authenticateUser } from "~/utils/login.server";

import loginStylesUrl from "../styles/login.css";

type ActionReturn = {
  values: {
    [key: string]: string;
  };
  errors: ProblemDetailsResponse;
};

export let links: LinksFunction = () => [
  { rel: "stylesheet", href: loginStylesUrl },
];

export let action: ActionFunction = async ({ request }) => {
  let body = await request.formData();
  let response = await authenticateUser(body);

  let payload = await response.json();

  if (!response.ok) {
    const values = Object.fromEntries(body);
    return json({ values, errors: payload });
  }

  let session = await getSession();
  session.set("id", payload.id);

  return redirect(body.get("redirectTo") as string, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export default function Login() {
  let [searchParams] = useSearchParams();

  let actionData = useActionData<ActionReturn>();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form
          method="post"
          aria-describedby={
            actionData?.errors.title ? "form-error-message" : undefined
          }
        >
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.values.loginType ||
                  actionData?.values.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={actionData?.values.loginType === "register"}
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="email-input">Email</label>
            <input
              type="text"
              id="email-input"
              name="email"
              defaultValue={actionData?.values.email}
              aria-invalid={Boolean(actionData?.errors.invalid_params!.email)}
              aria-describedby={
                actionData?.errors.invalid_params!.email
                  ? "email-error"
                  : undefined
              }
            />
            {actionData?.errors.invalid_params!.email ? (
              <p
                className="form-validation-error"
                role="alert"
                id="email-error"
              >
                {actionData?.errors.invalid_params!.email}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              defaultValue={actionData?.values.password}
              type="password"
              aria-invalid={Boolean(
                actionData?.errors.invalid_params!.password
              )}
              aria-describedby={
                actionData?.errors.invalid_params!.password
                  ? "password-error"
                  : undefined
              }
            />
            {actionData?.errors.invalid_params!.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData?.errors.invalid_params!.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.errors.title ? (
              <p className="form-validation-error" role="alert">
                {actionData?.errors.title}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
