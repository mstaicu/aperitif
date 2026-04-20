import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export const action = async ({ request }: { request: Request }) =>
  fetch("http://traefik-srv.traefik/auth/v1/passkeys/login", {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

async function handleLogin() {
  try {
    const res = await fetch("/login/challenge", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Auth challenge failed");
      return;
    }

    const { publicKey } = (await res.json()) as {
      publicKey: PublicKeyCredentialRequestOptionsJSON;
    };

    const authResponse = await startAuthentication({
      optionsJSON: publicKey,
    });

    const finish = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: authResponse,
      }),
    });

    if (!finish.ok) {
      console.error("Login failed");
      return;
    }

    console.log("Logged in");
  } catch (err) {
    console.error(err);
  }
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
