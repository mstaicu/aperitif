import { html } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

import { createLoginChallenge, finishLogin } from "../domains/passkeys.ts";
import { routes } from "../routes.ts";

export const loginPage = {
  actions: {
    action: ({ request }: { request: Request }) => finishLogin(request),
    challenge: ({ request }: { request: Request }) =>
      createLoginChallenge(request),
    index: () =>
      createHtmlResponse(
        html`<html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <title>Login</title>
            <style>
              :root {
                color-scheme: light;
                font-family: ui-sans-serif, system-ui, sans-serif;
                background: #f5f2eb;
                color: #14110f;
              }

              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
              }

              .shell {
                width: min(92vw, 42rem);
                border: 1px solid #d8cfbf;
                border-radius: 28px;
                background: linear-gradient(145deg, #fffaf0, #e9dfcd);
                box-shadow: 0 24px 80px rgb(20 17 15 / 14%);
                padding: 3rem;
              }

              .eyebrow {
                margin: 0 0 1rem;
                color: #7a4e19;
                font-size: 0.75rem;
                font-weight: 800;
                letter-spacing: 0.18em;
                text-transform: uppercase;
              }

              h1 {
                margin: 0;
                font-size: clamp(2.5rem, 8vw, 5.5rem);
                line-height: 0.9;
                letter-spacing: -0.08em;
              }

              .lead {
                max-width: 34rem;
                color: #5f5548;
                font-size: 1.1rem;
                line-height: 1.6;
              }

              a,
              button {
                border: 0;
                border-radius: 999px;
                background: #14110f;
                color: white;
                cursor: pointer;
                display: inline-flex;
                font: inherit;
                font-weight: 800;
                padding: 0.9rem 1.2rem;
                text-decoration: none;
              }

              .status,
              .back {
                min-height: 1.5rem;
                color: #5f5548;
              }

              .back a {
                background: transparent;
                color: #14110f;
                padding: 0;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <main class="shell">
              <p class="eyebrow">Identities</p>
              <h1>Return with your passkey</h1>
              <p class="lead">
                Verify your passkey and let the server action store the refresh
                token.
              </p>
              <button type="button" data-login>Login with passkey</button>
              <p class="status" data-status aria-live="polite"></p>
              <p class="back"><a href="${routes.home.href()}">Back</a></p>
            </main>
            <script type="module" src="/assets/login.client.js"></script>
          </body>
        </html>`,
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
  },
};
