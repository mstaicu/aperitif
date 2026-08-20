import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

const button = document.querySelector<HTMLButtonElement>("[data-passkey]");
const status = document.querySelector<HTMLParagraphElement>("[data-status]");

if (!button || !status) {
  throw new Error("Passkey controls are missing");
}

const { actionUrl, kind, optionsUrl } = button.dataset;

if (
  !actionUrl ||
  !optionsUrl ||
  (kind !== "authentication" && kind !== "registration")
) {
  throw new Error("Passkey configuration is invalid");
}

button.addEventListener("click", async () => {
  button.disabled = true;
  status.dataset.error = "false";
  status.textContent = "Waiting for your passkey…";

  try {
    const options = await fetch(optionsUrl, { method: "POST" });

    if (!options.ok) {
      throw new Error("Unable to create passkey options");
    }

    const optionsJSON = await options.json();
    const credential =
      kind === "registration"
        ? await startRegistration({
            optionsJSON: optionsJSON as PublicKeyCredentialCreationOptionsJSON,
          })
        : await startAuthentication({
            optionsJSON: optionsJSON as PublicKeyCredentialRequestOptionsJSON,
          });
    const response = await fetch(actionUrl, {
      body: JSON.stringify(credential),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Unable to finish passkey ceremony");
    }

    status.textContent =
      kind === "registration" ? "Passkey created." : "Logged in.";
  } catch {
    status.dataset.error = "true";
    status.textContent =
      kind === "registration" ? "Signup failed." : "Login failed.";
  } finally {
    button.disabled = false;
  }
});
