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

async function handleLogin() {
  const challengeRes = await fetch("/login/challenge", { method: "POST" });
  if (!challengeRes.ok) {
    console.error("Login challenge failed");
    return;
  }

  const { publicKey } = (await challengeRes.json()) as {
    publicKey: PublicKeyCredentialRequestOptions;
  };

  publicKey.challenge = base64urlToArrayBuffer(
    publicKey.challenge as unknown as string,
  );

  if (publicKey.allowCredentials?.length) {
    publicKey.allowCredentials = publicKey.allowCredentials.map(
      (cred: any) => ({
        ...cred,
        id: base64urlToArrayBuffer(cred.id),
      }),
    );
  }

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential;

  if (!credential) {
    console.error("No credential returned");
    return;
  }

  const assertion = credential.response as AuthenticatorAssertionResponse;

  const payload = {
    authentication: {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64url(assertion.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(assertion.authenticatorData),
        signature: arrayBufferToBase64url(assertion.signature),
        userHandle: assertion.userHandle
          ? arrayBufferToBase64url(assertion.userHandle)
          : undefined,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    },
  };

  const authRes = await fetch("/login/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!authRes.ok) {
    console.error("Login authenticate failed", await authRes.text());
    return;
  }

  console.log("Login complete:", await authRes.json());
}

export default function Login() {
  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Login with Passkey
      </button>
    </div>
  );
}
