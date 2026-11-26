import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const form = document.querySelector<HTMLFormElement>("[data-passkey]")!;
const button = form.querySelector("button")!;
const status = form.querySelector<HTMLElement>("[data-status]")!;
const registration = form.dataset.ceremony === "registration";

if (browserSupportsWebAuthn()) {
  button.disabled = false;
} else {
  status.dataset.error = "true";
  status.textContent = "Passkeys are not supported by this browser.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  status.dataset.error = "false";
  status.textContent = "Waiting for your passkey…";

  try {
    const options = await fetch(form.dataset.optionsAction!, {
      method: "POST",
    });
    if (!options.ok) throw options;

    const optionsJSON = await options.json();
    const body = registration
      ? { registration: await startRegistration({ optionsJSON }) }
      : await startAuthentication({ optionsJSON });

    const response = await fetch(form.action, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) throw response;

    window.location.assign((await response.json()).return_to);
  } catch {
    status.dataset.error = "true";
    status.textContent = registration
      ? "Signup failed. If your passkey was saved, try logging in."
      : "Login failed. Please try again.";
  } finally {
    button.disabled = false;
  }
});
