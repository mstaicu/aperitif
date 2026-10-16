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

  // Use an empty authenticator to add a second passkey.
  for (const credential of await context.credentials.get()) {
    await context.credentials.delete(credential.id);
  }

  const authorizationHeaders = [];
  page.on("request", (request) => {
    if (request.headers().authorization) {
      authorizationHeaders.push(request.headers().authorization);
    }
  });
  const logoutResponse = page.waitForResponse("**/identity/logout");
  const result = await page.evaluate(async () => {
    const account = await fetch("/identity/accounts", {
      body: JSON.stringify({ name: "Browser test account" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const { account: created } = await account.json();
    const accounts = await fetch("/identity/accounts");
    const listed = await accounts.json();
    const options = await fetch("/identity/passkeys/options", {
      method: "POST",
    });
    const credential = await navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(
        await options.json(),
      ),
    });
    const added = await fetch("/identity/passkeys", {
      body: JSON.stringify({ credential: credential.toJSON(), name: "Backup" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const passkey = await added.json();
    const renamed = await fetch(`/identity/passkeys/${passkey.id}`, {
      body: JSON.stringify({ name: "Renamed backup" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const renamedPasskey = await renamed.json();
    const removed = await fetch(
      `/identity/passkeys/${passkey.id.toUpperCase()}`,
      { method: "DELETE" },
    );
    const remaining = await fetch("/identity/passkeys");
    const { passkeys } = await remaining.json();
    const last = await fetch(`/identity/passkeys/${passkeys[0].id}`, {
      method: "DELETE",
    });
    const logout = await fetch("/identity/logout", { method: "POST" });
    const revokedAccounts = await fetch("/identity/accounts");
    const revokedPasskeys = await fetch("/identity/passkeys");

    return {
      account: account.status,
      accounts: accounts.status,
      accountVisible: listed.accounts.some(({ id }) => id === created.id),
      added: added.status,
      cacheControl: accounts.headers.get("Cache-Control"),
      last: last.status,
      logoutPath: new URL(logout.url).pathname,
      options: options.status,
      remaining: passkeys.length,
      removed: removed.status,
      renamed: renamed.status,
      renamedName: renamedPasskey.name,
      revokedAccounts: revokedAccounts.status,
      revokedPasskeys: revokedPasskeys.status,
      roles: created.roles,
    };
  });

  // Assert
  expect(result).toEqual({
    account: 201,
    accounts: 200,
    accountVisible: true,
    added: 201,
    cacheControl: "no-store",
    last: 409,
    logoutPath: "/identity/login",
    options: 200,
    remaining: 1,
    removed: 204,
    renamed: 200,
    renamedName: "Renamed backup",
    revokedAccounts: 401,
    revokedPasskeys: 401,
    roles: ["account.owner"],
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
