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

  const failureMessage = registration ? "Signup failed." : "Login failed.";

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
        body: JSON.stringify(registration ? { credential } : credential),
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

    const contentType = response.headers
      .get("Content-Type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (contentType === "application/problem+json") {
      const problem = await response.json();

      switch (problem?.type) {
        case "/problems/authentication-failed":
        case "/problems/registration-verification-failed":
          status.textContent = "Passkey verification failed. Please try again.";
          break;
        case "/problems/credential-already-exists":
        case "/problems/user-already-registered":
          status.textContent =
            "Already registered. Log in with your existing passkey.";
          break;
      }
    }
  } catch {
    status.dataset.error = "true";
    status.textContent = failureMessage;
  } finally {
    button.disabled = false;
  }
});
