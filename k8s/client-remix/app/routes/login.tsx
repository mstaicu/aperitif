import { fetch } from "@remix-run/node";
import { useActionData, useSearchParams, Link, redirect } from "remix";

import type { ActionFunction, LinksFunction } from "remix";
import type { ProblemDetailsResponse } from "@tartine/common";

import { getSession, commitSession } from "../utils/session.server";

import loginStylesUrl from "../styles/login.css";

type ActionReturn = {
  values: {
    email: string;
    password: string;
    loginType: string;
    redirectTo: string;
  };
  problemDetails: ProblemDetailsResponse;
};

export let links: LinksFunction = () => [
  { rel: "stylesheet", href: loginStylesUrl },
];

export let action: ActionFunction = async ({ request }) => {
  let form = await request.formData();

  let email = form.get("email") as string;
  let password = form.get("password") as string;

  let loginType = form.get("loginType") as string;
  let redirectTo = (form.get("redirectTo") as string) || "/jokes";

  /**
   * TODO: Validate loginType and redirectTo
   */

  let response = await fetch(`https://traefik-lb-srv/api/auth/${loginType}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "ticketing",
    },
    body: JSON.stringify({ email, password }),
  });

  let payload = await response.json();

  if (!response.ok) {
    return {
      values: {
        email,
        password,
        loginType,
        redirectTo,
      },
      problemDetails: payload,
    };
  }

  let session = await getSession();
  session.set("id", payload.id);

  throw redirect(redirectTo, {
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
            actionData?.problemDetails.title ? "form-error-message" : undefined
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
              aria-invalid={Boolean(
                actionData?.problemDetails.invalid_params!.email
              )}
              aria-describedby={
                actionData?.problemDetails.invalid_params!.email
                  ? "email-error"
                  : undefined
              }
            />
            {actionData?.problemDetails.invalid_params!.email ? (
              <p
                className="form-validation-error"
                role="alert"
                id="email-error"
              >
                {actionData?.problemDetails.invalid_params!.email.reason}
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
                actionData?.problemDetails.invalid_params!.password
              )}
              aria-describedby={
                actionData?.problemDetails.invalid_params!.password
                  ? "password-error"
                  : undefined
              }
            />
            {actionData?.problemDetails.invalid_params!.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData?.problemDetails.invalid_params!.password.reason}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.problemDetails.title ? (
              <p className="form-validation-error" role="alert">
                {actionData?.problemDetails.title}
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
