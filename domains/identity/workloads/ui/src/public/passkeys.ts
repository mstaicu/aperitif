import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const form = document.querySelector<HTMLFormElement>("[data-passkey]")!;
const button = form.querySelector<HTMLButtonElement>("button")!;
const status = form.querySelector<HTMLParagraphElement>("[data-status]")!;
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

  const failureMessage = registration
    ? "Signup failed. Try again or log in."
    : "Login failed. Please try again.";

  try {
    let response = await fetch(form.dataset.optionsAction!, {
      method: "POST",
    });

    if (response.ok) {
      const optionsJSON = await response.json();
      const credential = registration
        ? await startRegistration({ optionsJSON })
        : await startAuthentication({ optionsJSON });

      response = await fetch(form.action, {
        body: JSON.stringify(
          registration ? { registration: credential } : credential,
        ),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) {
        const result = (await response.json()) as { return_to: string };
        window.location.assign(result.return_to);
        return;
      }
    }

    status.dataset.error = "true";
    status.textContent = failureMessage;
  } catch {
    status.dataset.error = "true";
    status.textContent = failureMessage;
  } finally {
    button.disabled = false;
  }
});
