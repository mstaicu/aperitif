import { expect, test } from "@playwright/test";

test("signs up, logs in, creates an account, and logs out", async ({
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

  const logoutResponse = page.waitForResponse("**/identity/logout");
  const result = await page.evaluate(async () => {
    const access = await fetch("/identity/access-token", { method: "POST" });
    const { access_token, expires_in } = await access.json();
    const headers = { Authorization: `Bearer ${access_token}` };
    const account = await fetch("/v1/accounts", {
      body: JSON.stringify({ name: "Browser test account" }),
      headers: { ...headers, "Content-Type": "application/json" },
      method: "POST",
    });
    const { account: created } = await account.json();
    const logout = await fetch("/identity/logout", { method: "POST" });
    const exchange = await fetch("/identity/access-token", { method: "POST" });
    const revoked = await fetch("/v1/accounts", { headers });

    return {
      access: access.status,
      account: account.status,
      cacheControl: access.headers.get("Cache-Control"),
      challenge: revoked.headers.get("WWW-Authenticate"),
      exchange: exchange.status,
      expiresIn: expires_in,
      logoutPath: new URL(logout.url).pathname,
      revoked: revoked.status,
      roles: created.roles,
    };
  });

  // Assert
  expect(result).toEqual({
    access: 200,
    account: 201,
    cacheControl: "no-store",
    challenge: "Bearer",
    exchange: 401,
    expiresIn: 300,
    logoutPath: "/identity/login",
    revoked: 401,
    roles: ["account.owner"],
  });
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
