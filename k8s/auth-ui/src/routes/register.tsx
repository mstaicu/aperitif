function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function handleRegister() {
  const challengeRes = await fetch("/register/challenge", { method: "POST" });
  if (!challengeRes.ok) {
    console.error("Registration challenge failed");
    return;
  }

  const { publicKey } = (await challengeRes.json()) as {
    publicKey: PublicKeyCredentialCreationOptions;
  };

  // WebAuthn expects ArrayBuffers for these fields
  publicKey.challenge = base64urlToArrayBuffer(
    publicKey.challenge as unknown as string,
  );

  publicKey.user = {
    ...publicKey.user,
    id: base64urlToArrayBuffer((publicKey.user as any).id as unknown as string),
  };

  if (publicKey.excludeCredentials?.length) {
    publicKey.excludeCredentials = publicKey.excludeCredentials.map((c) => ({
      ...c,
      id: base64urlToArrayBuffer(c.id as unknown as string),
    }));
  }

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential;

  if (!credential) {
    console.error("No credential created");
    return;
  }

  const attestation = credential.response as AuthenticatorAttestationResponse;

  const payload = {
    credential: {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64url(attestation.clientDataJSON),
        attestationObject: arrayBufferToBase64url(
          attestation.attestationObject,
        ),
      },
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    },
  };

  const finishRes = await fetch("/register/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!finishRes.ok) {
    console.error("Registration finish failed", await finishRes.text());
    return;
  }

  console.log("Registration complete:", await finishRes.json());
}

export default function Register() {
  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={handleRegister}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Register Passkey
      </button>
    </div>
  );
}
