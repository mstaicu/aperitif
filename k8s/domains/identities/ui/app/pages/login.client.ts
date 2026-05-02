import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

const button = document.querySelector<HTMLButtonElement>("[data-login]")!;
const status = document.querySelector<HTMLElement>("[data-status]")!;

button.addEventListener("click", async () => {
  try {
    const actionUrl = button.dataset.actionUrl!;
    const challengeUrl = button.dataset.challengeUrl!;

    status.style.color = "#5f5548";
    status.textContent = "Waiting for passkey...";

    const challenge = await fetch(challengeUrl, { method: "POST" });
    const { publicKey } = (await challenge.json()) as {
      publicKey: PublicKeyCredentialRequestOptionsJSON;
    };

    if (!challenge.ok) throw new Error();

    const authentication = await startAuthentication({
      optionsJSON: publicKey,
    });
    const finish = await fetch(actionUrl, {
      body: JSON.stringify({ authentication }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!finish.ok) throw new Error();

    status.textContent = "Logged in.";
  } catch {
    status.style.color = "#9d1f1f";
    status.textContent = "Login failed.";
  }
});
