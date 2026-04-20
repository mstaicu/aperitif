import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

export async function action({ request }: { request: Request }) {
  return fetch("http://traefik-srv.traefik/auth/v1/passkeys/register", {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("Content-Type") ?? "application/json",
    },
    body: await request.text(),
  });
}

async function handleRegister() {
  try {
    const res = await fetch("/register/challenge", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Challenge failed");
      return;
    }

    const { publicKey } = (await res.json()) as {
      publicKey: PublicKeyCredentialCreationOptionsJSON;
    };

    const registrationResponse = await startRegistration({
      optionsJSON: publicKey,
    });

    const finish = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: registrationResponse,
      }),
    });

    if (!finish.ok) {
      console.error("Finalize failed");
      return;
    }

    console.log("Registered");
  } catch (err) {
    console.error(err);
  }
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
