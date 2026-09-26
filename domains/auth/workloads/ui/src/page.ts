import type { AssetServer } from "remix/assets";
import { html } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

export async function authPage(
  ceremony: "authentication" | "registration",
  returnTo: string,
  assets: AssetServer,
) {
  const registration = ceremony === "registration";
  const title = registration ? "Sign up" : "Log in";
  const action = registration ? "/signup" : "/login";
  const alternate = registration ? "/login" : "/signup";
  const query =
    returnTo === "/"
      ? ""
      : `?${new URLSearchParams({ return_to: returnTo }).toString()}`;
  const script = await assets.getScriptEntry("src/public/passkeys.ts");

  const importMap = html.raw`<script type="importmap">${JSON.stringify(
    script.importMap,
  ).replaceAll("<", "\\u003c")}</script>`;

  return createHtmlResponse(
    html`
      <!doctype html>
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
          ${importMap}
          ${script.preloads.map(
            (href) => html`<link rel="modulepreload" href="${href}" />`,
          )}
          <script type="module" src="${script.href}"></script>
        </head>
        <body>
          <main>
            <p class="eyebrow">Auth</p>
            <h1>${registration ? "Create your passkey" : "Welcome back"}</h1>
            <p class="lead">
              ${registration
                ? "Register with a passkey and start your first session."
                : "Use your passkey to start a new session."}
            </p>

            <form
              method="post"
              action="${action}${query}"
              data-passkey
              data-ceremony="${ceremony}"
              data-options-action="${action}/options"
            >
              <button type="submit" disabled>${title} with passkey</button>
              <p class="status" data-status aria-live="polite"></p>
              <noscript>
                <p class="status" data-error="true">
                  Passkeys require JavaScript in this browser.
                </p>
              </noscript>
            </form>

            <p class="switch">
              ${registration
                ? html`Already registered?
                    <a href="${alternate}${query}">Log in</a>`
                : html`New here? <a href="${alternate}${query}">Sign up</a>`}
            </p>
          </main>
        </body>
      </html>
    `,
    { headers: { "Cache-Control": "no-store" } },
  );
}
