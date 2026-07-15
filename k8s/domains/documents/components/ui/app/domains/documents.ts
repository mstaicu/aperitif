import type { RequestContext } from "remix/fetch-router";

const apiInternalV1Url = (
  process.env.API_INTERNAL_V1_URL ??
  "http://traefik-internal.traefik.svc.cluster.local/v1"
).replace(/\/+$/, "");

export async function loadDocuments({ request }: RequestContext) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const refreshToken = request.headers
    .get("Cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("refresh_token="))
    ?.slice("refresh_token=".length);

  if (!refreshToken) {
    return { body: { error: "missing refresh_token cookie" } };
  }

  if (!accountId) {
    return { body: { error: "missing account_id query parameter" } };
  }

  const accessTokenResponse = await fetch(
    `${apiInternalV1Url}/sessions/access-token`,
    {
      headers: {
        Authorization: `Bearer ${decodeURIComponent(refreshToken)}`,
      },
      method: "POST",
    },
  );
  const accessToken = await accessTokenResponse.json();

  if (
    !accessTokenResponse.ok ||
    typeof accessToken.access_token !== "string"
  ) {
    return {
      body: {
        identity: {
          body: accessToken,
          status: accessTokenResponse.status,
        },
      },
    };
  }

  const documentsResponse = await fetch(
    `${apiInternalV1Url}/accounts/${encodeURIComponent(accountId)}/documents`,
    {
      headers: {
        Authorization: `Bearer ${accessToken.access_token}`,
      },
    },
  );

  return {
    body: {
      documents: {
        body: await documentsResponse.json(),
        status: documentsResponse.status,
      },
    },
  };
}
