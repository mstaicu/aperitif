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

async function handleLogin() {
  const challengeRes = await fetch("/login.challenge", {
    method: "POST",
  });

  if (!challengeRes.ok) {
    console.error("Challenge failed");
    return;
  }

  const { publicKey } = await challengeRes.json();

  publicKey.challenge = base64urlToBuffer(publicKey.challenge);

  if (publicKey.allowCredentials) {
    publicKey.allowCredentials = publicKey.allowCredentials.map(
      (cred: any) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }),
    );
  }

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential;

  const response = credential.response as AuthenticatorAssertionResponse;

  await fetch("/login.authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authentication: {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          authenticatorData: bufferToBase64url(response.authenticatorData),
          signature: bufferToBase64url(response.signature),
          userHandle: response.userHandle
            ? bufferToBase64url(response.userHandle)
            : undefined,
        },
        clientExtensionResults: credential.getClientExtensionResults(),
        authenticatorAttachment:
          credential.authenticatorAttachment ?? undefined,
      },
    }),
  });
}

export default () => (
  <div className="h-screen flex items-center justify-center">
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-black text-white rounded-lg"
    >
      Login with Passkey
    </button>
  </div>
);
