function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function Register() {
  async function handleRegister() {
    const challengeRes = await fetch(
      "https://api.tma.com/auth/webauthn/registration/challenge",
      { method: "POST" },
    );

    const { publicKey } = await challengeRes.json();

    publicKey.challenge = base64urlToBuffer(publicKey.challenge);
    publicKey.user.id = base64urlToBuffer(publicKey.user.id);

    if (publicKey.excludeCredentials) {
      publicKey.excludeCredentials = publicKey.excludeCredentials.map(
        (cred: any) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        }),
      );
    }

    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    const response = credential.response as AuthenticatorAttestationResponse;

    await fetch("https://api.tma.com/auth/webauthn/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64url(response.clientDataJSON),
            attestationObject: bufferToBase64url(response.attestationObject),
          },
          clientExtensionResults: credential.getClientExtensionResults(),
          authenticatorAttachment:
            credential.authenticatorAttachment ?? undefined,
        },
      }),
    });

    console.log("registered");
  }

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
