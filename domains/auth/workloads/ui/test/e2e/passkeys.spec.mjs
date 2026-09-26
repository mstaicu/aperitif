import { expect, test } from "@playwright/test";

test("explains when a browser cannot use passkeys", async ({ page }) => {
  // Arrange
  await page.addInitScript(() => {
    Object.defineProperty(window, "PublicKeyCredential", { value: undefined });
  });

  // Act
  await page.goto("/signup");

  // Assert
  await expect(
    page.getByText("Passkeys are not supported by this browser."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign up with passkey" }),
  ).toBeDisabled();
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await expect(page.locator("form")).toHaveAttribute("action", "/signup");
});

test("a person can sign up, log in, and log out", async ({ context, page }) => {
  // Arrange
  await context.credentials.install();

  // Act
  await page.goto("/signup?return_to=%2Flogin");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();

  // Assert
  await expect(page).toHaveURL("/login");
  expect(await context.credentials.get()).toHaveLength(1);

  const signupSession = (await context.cookies()).find(
    (cookie) => cookie.name === "session_token",
  );
  expect(signupSession).toBeDefined();

  // Arrange
  await context.clearCookies({ name: "session_token" });

  // Act
  await page.goto("/login?return_to=%2Fsignup");
  await page.getByRole("button", { name: "Log in with passkey" }).click();

  // Assert
  await expect(page).toHaveURL("/signup");

  const loginSession = (await context.cookies()).find(
    (cookie) => cookie.name === "session_token",
  );
  expect(loginSession).toBeDefined();
  expect(loginSession?.value).not.toBe(signupSession?.value);

  // Act
  const logout = await context.request.post("/logout", { maxRedirects: 0 });

  // Assert
  expect(logout.status()).toBe(303);
  expect(logout.headers().location).toBe("/login");
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "session_token"),
  ).toBeUndefined();

  const revoked = await context.request.post("/v1/session/access-tokens", {
    headers: { Authorization: `Bearer ${loginSession.value}` },
  });
  expect(revoked.status()).toBe(401);
});

test("return_to accepts only local paths", async ({ page }) => {
  await page.goto("/login?return_to=https%3A%2F%2Fevil.example");

  await expect(page.locator("form")).toHaveAttribute("action", "/login");
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/signup",
  );
});
