import {
  browserSupportsPasskeys,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const form = document.querySelector<HTMLFormElement>("[data-passkey]")!;
const button = form.querySelector<HTMLButtonElement>("button")!;
const status = form.querySelector<HTMLParagraphElement>("[data-status]")!;
const registration = form.dataset.ceremony === "registration";

if (await browserSupportsPasskeys()) {
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
    const options = await fetch(form.dataset.optionsAction!, { method: "POST" });

    if (!options.ok) throw new Error();

    const optionsJSON = await options.json();
    const credential = registration
      ? await startRegistration({ optionsJSON })
      : await startAuthentication({ optionsJSON });
    const response = await fetch(form.action, {
      body: JSON.stringify(credential),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) throw new Error();

    const result = (await response.json()) as { return_to: string };
    window.location.assign(result.return_to);
  } catch {
    status.dataset.error = "true";
    status.textContent = registration ? "Signup failed." : "Login failed.";
    button.disabled = false;
  }
});
