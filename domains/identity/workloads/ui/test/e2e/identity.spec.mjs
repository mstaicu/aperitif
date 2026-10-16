import { expect, test } from "@playwright/test";

test("signs up, logs in, manages accounts and passkeys, and logs out", async ({
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();

  // Act
  await page.goto("/identity/signup?return_to=%2Fidentity%2Flogin");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();

  await expect(page).toHaveURL("/identity/login");

  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === "identity_session_token",
    )?.httpOnly,
  ).toBe(true);

  await context.clearCookies({ name: "identity_session_token" });
  await page.goto("/identity/login?return_to=%2Fidentity%2Fsignup");
  await page.getByRole("button", { name: "Log in with passkey" }).click();

  await expect(page).toHaveURL("/identity/signup");

  const authentication = await page.evaluate(async () => {
    const options = await fetch("/identity/login/options", { method: "POST" });
    const proof = await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
        await options.json(),
      ),
    });
    return proof.toJSON();
  });
  const [originalCredential] = await context.credentials.get();
  // Switch to an empty authenticator after proving possession of the original.
  await context.credentials.delete(originalCredential.id);

  const authorizationHeaders = [];
  page.on("request", (request) => {
    if (request.headers().authorization) {
      authorizationHeaders.push(request.headers().authorization);
    }
  });
  const logoutResponse = page.waitForResponse("**/identity/logout");
  const result = await page.evaluate(async (authentication) => {
    const account = await fetch("/identity/accounts", {
      body: JSON.stringify({ name: "Browser test account" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const { account: created } = await account.json();
    const accounts = await fetch("/identity/accounts");
    const listed = await accounts.json();
    const options = await fetch("/identity/passkeys/registration/options", {
      method: "POST",
    });
    const credential = await navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(
        await options.json(),
      ),
    });
    const missingProof = await fetch("/identity/passkeys/registration", {
      body: JSON.stringify({ credential: credential.toJSON(), name: "Backup" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const added = await fetch("/identity/passkeys/registration", {
      body: JSON.stringify({
        authentication,
        credential: credential.toJSON(),
        name: "Backup",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const { passkeys: updatedPasskeys } = await (
      await fetch("/identity/passkeys")
    ).json();
    const passkey = updatedPasskeys.find(({ name }) => name === "Backup");
    const renamed = await fetch(`/identity/passkeys/${passkey.id}`, {
      body: JSON.stringify({ name: "Renamed backup" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const renamedPasskey = await renamed.json();
    const replay = await fetch(`/identity/passkeys/${passkey.id}/delete`, {
      body: JSON.stringify({ authentication }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const loginReplay = await fetch("/identity/login", {
      body: JSON.stringify(authentication),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const deletionOptions = await fetch("/identity/login/options", {
      method: "POST",
    });
    const proof = await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
        await deletionOptions.json(),
      ),
    });
    const removed = await fetch(
      `/identity/passkeys/${passkey.id.toUpperCase()}/delete`,
      {
        body: JSON.stringify({ authentication: proof.toJSON() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const remaining = await fetch("/identity/passkeys");
    const { passkeys } = await remaining.json();

    return {
      account: account.status,
      accounts: accounts.status,
      accountVisible: listed.accounts.some(({ id }) => id === created.id),
      added: added.status,
      addedBody: await added.text(),
      cacheControl: accounts.headers.get("Cache-Control"),
      loginReplay: loginReplay.status,
      missingProof: missingProof.status,
      options: options.status,
      remaining: passkeys.length,
      removed: removed.status,
      renamed: renamed.status,
      renamedName: renamedPasskey.name,
      replay: replay.status,
      roles: created.roles,
    };
  }, authentication);

  expect(result).toEqual({
    account: 201,
    accounts: 200,
    accountVisible: true,
    added: 204,
    addedBody: "",
    cacheControl: "no-store",
    loginReplay: 401,
    missingProof: 401,
    options: 200,
    remaining: 1,
    removed: 204,
    renamed: 200,
    renamedName: "Renamed backup",
    replay: 401,
    roles: ["account.owner"],
  });

  // Return to the original authenticator to verify the last-passkey guard.
  for (const credential of await context.credentials.get()) {
    await context.credentials.delete(credential.id);
  }
  await context.credentials.create(originalCredential.rpId, originalCredential);

  const final = await page.evaluate(async () => {
    const { passkeys } = await (await fetch("/identity/passkeys")).json();
    const options = await fetch("/identity/login/options", { method: "POST" });
    const proof = await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
        await options.json(),
      ),
    });
    const request = {
      body: JSON.stringify({ authentication: proof.toJSON() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    };
    const last = await fetch(
      `/identity/passkeys/${passkeys[0].id}/delete`,
      request,
    );
    const retry = await fetch(
      `/identity/passkeys/${passkeys[0].id}/delete`,
      request,
    );
    const logout = await fetch("/identity/logout", { method: "POST" });
    const accounts = await fetch("/identity/accounts");
    const keys = await fetch("/identity/passkeys");
    return {
      accounts: accounts.status,
      keys: keys.status,
      last: last.status,
      logoutPath: new URL(logout.url).pathname,
      retry: retry.status,
    };
  });

  // Assert
  expect(final).toEqual({
    accounts: 401,
    keys: 401,
    last: 409,
    logoutPath: "/identity/login",
    retry: 401,
  });
  expect(authorizationHeaders).toEqual([]);
  expect((await logoutResponse).status()).toBe(303);
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === "identity_session_token",
    ),
  ).toBeUndefined();
});

test("keeps unsafe return paths on this site", async ({ page }) => {
  for (const returnTo of ["https://evil.example", "//evil.example"]) {
    // Act
    const query = new URLSearchParams({ return_to: returnTo });
    await page.goto(`/identity/login?${query}`);

    // Assert
    await expect(page.locator("form")).toHaveAttribute(
      "action",
      "/identity/login",
    );
    await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/identity/signup",
    );
  }
});

test("explains when passkeys are unavailable", async ({ page }) => {
  // Arrange
  await page.addInitScript(() => {
    Object.defineProperty(window, "PublicKeyCredential", { value: undefined });
  });

  // Act
  await page.goto("/identity/signup");

  // Assert
  await expect(
    page.getByText("Passkeys are not supported by this browser."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign up with passkey" }),
  ).toBeDisabled();
});
