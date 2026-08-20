import { html } from "remix/html-template";

import { createDocumentResponse, type PageAssets } from "./document.ts";

export function signupPage(assets: PageAssets) {
  return createDocumentResponse({
    ...assets,
    title: "Sign up",
    content: html`
      <p class="eyebrow">Auth</p>
      <h1>Create your passkey</h1>
      <p class="lead">Register with a passkey and start your first session.</p>
      <button
        type="button"
        data-passkey
        data-kind="registration"
        data-options-url="/signup/options"
        data-action-url="/signup"
      >
        Sign up with passkey
      </button>
      <p class="status" data-status aria-live="polite"></p>
      <p class="switch">Already registered? <a href="/login">Log in</a></p>
    `,
  });
}
