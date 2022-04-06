import { fetch } from "@remix-run/node";
import { useActionData, useSearchParams, Link, redirect } from "remix";

import type { ActionFunction, LinksFunction } from "remix";
import type { ProblemDetailsResponse } from "@tartine/common";

import { getSession, commitSession } from "../utils/session.server";
import loginStylesUrl from "../styles/login.css";

type AuthenticationResponse = {
  id: string;
};

export let links: LinksFunction = () => [
  { rel: "stylesheet", href: loginStylesUrl },
];

export let action: ActionFunction = async ({
  request,
}): Promise<ProblemDetailsResponse | Response> => {
  let form = await request.formData();

  let email = form.get("email");
  let password = form.get("password");

  let loginType = form.get("loginType");
  let redirectTo = form.get("redirectTo");

  let response = await fetch(`https://traefik-lb-srv/api/auth/${loginType}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "ticketing",
    },
    body: JSON.stringify({ email, password }),
  });

  let responsePayload: AuthenticationResponse | ProblemDetailsResponse =
    await response.json();

  if (!response.ok) {
    return responsePayload as ProblemDetailsResponse;
  }

  let session = await getSession();
  session.set("id", (responsePayload as AuthenticationResponse).id);

  throw redirect(redirectTo as string, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export default function Login() {
  let [searchParams] = useSearchParams();

  let problemDetails = useActionData<ProblemDetailsResponse>();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form
          method="post"
          aria-describedby={
            problemDetails?.formError ? "form-error-message" : undefined
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
                  !problemDetails?.fields?.loginType ||
                  problemDetails?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={
                  problemDetails?.fields?.loginType === "register"
                }
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
              defaultValue={problemDetails?.fields?.email}
              aria-invalid={Boolean(problemDetails?.fieldErrors?.email)}
              aria-describedby={
                problemDetails?.fieldErrors?.email ? "email-error" : undefined
              }
            />
            {problemDetails?.fieldErrors?.email ? (
              <p
                className="form-validation-error"
                role="alert"
                id="email-error"
              >
                {problemDetails?.fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              defaultValue={problemDetails?.fields?.password}
              type="password"
              aria-invalid={
                Boolean(problemDetails?.fieldErrors?.password) || undefined
              }
              aria-describedby={
                problemDetails?.fieldErrors?.password
                  ? "password-error"
                  : undefined
              }
            />
            {problemDetails?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {problemDetails?.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {problemDetails?.formError ? (
              <p className="form-validation-error" role="alert">
                {problemDetails?.formError}
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
