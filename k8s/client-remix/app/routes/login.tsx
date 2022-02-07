import type { ActionFunction, LinksFunction } from "remix";
import { useActionData, Link, useSearchParams } from "remix";

import stylesUrl from "../styles/login.css";

import { login, createUserSession, register } from "~/utils/session.server";

export let links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
];

function validateEmail(email: unknown) {
  if (typeof email !== "string" || email.length < 3) {
    return `Email must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    email: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    email: string;
    password: string;
  };
};

export let action: ActionFunction = async ({
  request,
}): Promise<Response | ActionData> => {
  let form = await request.formData();

  let loginType = form.get("loginType");
  let redirectTo = form.get("redirectTo") || "/jokes";

  let email = form.get("email");
  let password = form.get("password");

  if (
    typeof loginType !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return { formError: `Form not submitted correctly.` };
  }

  /**
   * TODO: Validate the fields on the server?
   */
  let fields = { loginType, email, password };
  let fieldErrors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };

  if (Object.values(fieldErrors).some(Boolean)) return { fieldErrors, fields };

  switch (loginType) {
    case "login": {
      let user = await login({ email, password });

      if (!user) {
        return {
          fields,
          formError: `Email/Password combination is incorrect`,
        };
      }

      return createUserSession(user.id, redirectTo);
    }
    case "register": {
      let user = await register({ email, password });

      if (!user) {
        return {
          fields,
          formError: `Cannot register the given username`,
        };
      }

      return createUserSession(user.id, redirectTo);
    }
    default: {
      return { fields, formError: `Login type invalid` };
    }
  }
};

export default function Login() {
  let [searchParams] = useSearchParams();

  let actionData = useActionData<ActionData>();

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
