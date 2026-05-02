import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

const button = document.querySelector<HTMLButtonElement>("[data-register]")!;
const status = document.querySelector<HTMLElement>("[data-status]")!;

button.addEventListener("click", async () => {
  try {
    status.style.color = "#5f5548";
    status.textContent = "Waiting for passkey...";

    const challenge = await fetch("/register/challenge", { method: "POST" });
    const { publicKey } = (await challenge.json()) as {
      publicKey: PublicKeyCredentialCreationOptionsJSON;
    };

    if (!challenge.ok) throw new Error();

    const credential = await startRegistration({ optionsJSON: publicKey });
    const finish = await fetch("/register", {
      body: JSON.stringify({ credential }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!finish.ok) throw new Error();

    status.textContent = "Registered.";
  } catch {
    status.style.color = "#9d1f1f";
    status.textContent = "Registration failed.";
  }
});
