import { expect, test } from "@playwright/test";

test("a person signs up, logs in, receives an access token, and logs out", async ({
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();

  // Act
  await page.goto("/identity/signup?return_to=%2Fidentity%2Flogin");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();

  // Assert
  await expect(page).toHaveURL("/identity/login");

  const signupToken = (await context.cookies()).find(
    (cookie) => cookie.name === "identity_session_token",
  )?.value;
  expect(signupToken).toBeTruthy();

  // Act
  await context.clearCookies({ name: "identity_session_token" });
  await page.goto("/identity/login?return_to=%2Fidentity%2Fsignup");
  await page.getByRole("button", { name: "Log in with passkey" }).click();

  // Assert
  await expect(page).toHaveURL("/identity/signup");

  const sessionToken = (await context.cookies()).find(
    (cookie) => cookie.name === "identity_session_token",
  )?.value;
  expect(sessionToken).toBeTruthy();
  expect(sessionToken).not.toBe(signupToken);

  // Act
  const access = await context.request.post("/v1/session/access-tokens", {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const logout = await context.request.post("/identity/logout", {
    maxRedirects: 0,
  });
  const revoked = await context.request.post("/v1/session/access-tokens", {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });

  // Assert
  const accessToken = await access.json();

  expect(access.status()).toBe(200);
  expect(accessToken.access_token).toBeTruthy();
  expect(accessToken.expires_in).toBe(300);
  expect(logout.status()).toBe(303);
  expect(logout.headers().location).toBe("/identity/login");
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === "identity_session_token",
    ),
  ).toBeUndefined();
  expect(revoked.status()).toBe(401);
  expect(revoked.headers()["www-authenticate"]).toBe("Bearer");
});

test("keeps unsafe return paths on this site", async ({ page }) => {
  // Act
  await page.goto("/identity/login?return_to=https%3A%2F%2Fevil.example");

  // Assert
  await expect(page.locator("form")).toHaveAttribute(
    "action",
    "/identity/login",
  );
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/identity/signup",
  );

  // Act
  await page.goto("/identity/login?return_to=%2F%2Fevil.example");

  // Assert
  await expect(page.locator("form")).toHaveAttribute(
    "action",
    "/identity/login",
  );
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
