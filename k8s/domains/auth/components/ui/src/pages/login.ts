import { html } from "remix/html-template";

import { createDocumentResponse, type PageAssets } from "./document.ts";

export function loginPage(assets: PageAssets) {
  return createDocumentResponse({
    ...assets,
    title: "Log in",
    content: html`
      <p class="eyebrow">Auth</p>
      <h1>Welcome back</h1>
      <p class="lead">Use your passkey to start a new session.</p>
      <button
        type="button"
        data-passkey
        data-kind="authentication"
        data-options-url="/login/options"
        data-action-url="/login"
      >
        Log in with passkey
      </button>
      <p class="status" data-status aria-live="polite"></p>
      <p class="switch">New here? <a href="/signup">Sign up</a></p>
    `,
  });
}
