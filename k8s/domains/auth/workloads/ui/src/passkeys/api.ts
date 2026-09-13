import * as s from "remix/data-schema";
import { minLength } from "remix/data-schema/checks";

const apiUrl = process.env.API_INTERNAL_V1_URL!.replace(/\/+$/, "");
const session = s.object({
  session_token: s.string().pipe(minLength(1)),
  expires_in: s
    .number()
    .refine((value) => Number.isSafeInteger(value) && value > 0),
});

type PasskeyPath = `${"authentication" | "registration"}${"" | "/options"}`;

export async function postPasskey(request: Request, path: PasskeyPath) {
  const options = path.endsWith("/options");
  const headers = new Headers({ "Cache-Control": "no-store" });
  let body: string | undefined;

  if (!options) {
    if (
      request.headers
        .get("Content-Type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase() !== "application/json"
    ) {
      return Response.json(
        { error: "Expected application/json" },
        { headers, status: 415 },
      );
    }

    try {
      body = JSON.stringify(await request.json());
    } catch {
      request.signal.throwIfAborted();
      return Response.json({ error: "Invalid JSON" }, { headers, status: 400 });
    }
  }

  const timeout = AbortSignal.timeout(5_000);

  try {
    const response = await fetch(`${apiUrl}/passkeys/${path}`, {
      body,
      headers: options ? undefined : { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.any([request.signal, timeout]),
    });
    const payload = await response.json();

    if (!options && response.ok) {
      const { session_token, expires_in } = s.parse(session, payload);
      headers.set(
        "Set-Cookie",
        `session_token=${encodeURIComponent(session_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expires_in}; Secure`,
      );
    }

    return Response.json(!options && response.ok ? { ok: true } : payload, {
      headers,
      status: response.status,
    });
  } catch (error) {
    request.signal.throwIfAborted();
    console.error(error);

    return Response.json(
      {
        error: timeout.aborted ? "Auth API timed out" : "Auth API unavailable",
      },
      { headers, status: timeout.aborted ? 504 : 502 },
    );
  }
}
