import type { AssetServer } from "remix/assets";
import { html } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

export async function passkeyPage(
  ceremony: "registration" | "authentication",
  assets: AssetServer,
) {
  const registration = ceremony === "registration";
  const title = registration ? "Sign up" : "Log in";
  const path = registration ? "/signup" : "/login";

  return createHtmlResponse(
    html`
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <title>${title} · Auth</title>
          <link
            rel="stylesheet"
            href="${await assets.getHref("src/public/styles.css")}"
          />
          <script
            type="module"
            src="${await assets.getHref("src/passkeys/public/client.ts")}"
          ></script>
        </head>
        <body>
          <main>
            <p class="eyebrow">Auth</p>
            <h1>${registration ? "Create your passkey" : "Welcome back"}</h1>
            <p class="lead">
              ${
          registration
            ? "Register with a passkey and start your first session."
            : "Use your passkey to start a new session."
        }
            </p>
            <button
              type="button"
              data-passkey
              data-kind="${ceremony}"
              data-action="${path}"
            >
              ${title} with passkey
            </button>
            <p class="status" data-status aria-live="polite"></p>
            <p class="switch">
              ${
          registration
            ? html`Already registered? <a href="/login">Log in</a>`
            : html`New here? <a href="/signup">Sign up</a>`
        }
            </p>
          </main>
        </body>
      </html>
    `,
    { headers: { "Cache-Control": "no-store" } },
  );
}
