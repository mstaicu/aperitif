import { fetch } from "@remix-run/node";
import { useActionData, Link, useSearchParams } from "remix";

import type { ActionFunction, LinksFunction } from "remix";
import type { ProblemDetailsResponse } from "@tartine/common";

import stylesUrl from "../styles/login.css";

import { createSession } from "../utils/session.server";

export let links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
];

const onAuthenticateUser = async (
  email: string,
  password: string,
  loginType: string,
  redirectTo: string
): Promise<ProblemDetailsResponse | undefined> => {
  let response = await fetch(`https://traefik-lb-srv/api/auth/${loginType}`, {
    method: "POST",
    headers: {
      ContentType: "application/json",
      Host: "ticketing",
    },
    body: JSON.stringify({ email, password }),
  });

  let responsePayload = await response.json();

  if (!response.ok) {
    return responsePayload;
  }

  createSession(responsePayload, redirectTo);
};

export let action: ActionFunction = async ({
  request,
}): Promise<ProblemDetailsResponse | undefined> => {
  let form = await request.formData();

  let email = form.get("email");
  let password = form.get("password");

  let loginType = form.get("loginType");
  let redirectTo = form.get("redirectTo");

  return await onAuthenticateUser(email, password, loginType, redirectTo);
};

export default function Login() {
  let [searchParams] = useSearchParams();

  let actionData = useActionData<ProblemDetailsResponse>();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form
          method="post"
          aria-describedby={
            actionData?.formError ? "form-error-message" : undefined
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
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={actionData?.fields?.loginType === "register"}
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
              defaultValue={actionData?.fields?.email}
              aria-invalid={Boolean(actionData?.fieldErrors?.email)}
              aria-describedby={
                actionData?.fieldErrors?.email ? "email-error" : undefined
              }
            />
            {actionData?.fieldErrors?.email ? (
              <p
                className="form-validation-error"
                role="alert"
                id="email-error"
              >
                {actionData?.fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              defaultValue={actionData?.fields?.password}
              type="password"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.password) || undefined
              }
              aria-describedby={
                actionData?.fieldErrors?.password ? "password-error" : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData?.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p className="form-validation-error" role="alert">
                {actionData?.formError}
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
