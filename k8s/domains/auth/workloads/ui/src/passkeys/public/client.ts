import {
  browserSupportsPasskeys,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const button = document.querySelector<HTMLButtonElement>("[data-passkey]")!;
const status = document.querySelector<HTMLParagraphElement>("[data-status]")!;

const registration = button.dataset.kind === "registration";
const action = button.dataset.action!;

if (!(await browserSupportsPasskeys())) {
  button.disabled = true;
  status.dataset.error = "true";
  status.textContent = "Passkeys are not supported by this browser.";
}

button.addEventListener("click", async () => {
  button.disabled = true;
  status.dataset.error = "false";
  status.textContent = "Waiting for your passkey…";

  try {
    const options = await fetch(`${action}/options`, { method: "POST" });

    if (!options.ok) {
      throw new Error("Unable to create passkey options");
    }

    const optionsJSON = await options.json();
    const credential = registration
      ? await startRegistration({ optionsJSON })
      : await startAuthentication({ optionsJSON });
    const response = await fetch(action, {
      body: JSON.stringify(credential),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Unable to finish passkey ceremony");
    }

    status.textContent = registration ? "Passkey created." : "Logged in.";
  } catch {
    status.dataset.error = "true";
    status.textContent = registration ? "Signup failed." : "Login failed.";
  } finally {
    button.disabled = false;
  }
});
