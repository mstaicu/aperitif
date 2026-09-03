import { expect, test } from "@playwright/test";

test("a person can sign up and log in with a passkey", async ({
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();

  // Act
  await page.goto("/signup");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();

  // Assert
  await expect(page.locator("[data-status]")).toHaveText("Passkey created.");
  expect(await context.credentials.get()).toHaveLength(1);

  const signupSession = (await context.cookies()).find(
    (cookie) => cookie.name === "session_token",
  );
  expect(signupSession).toBeDefined();

  // Arrange
  await context.clearCookies({ name: "session_token" });

  // Act
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in with passkey" }).click();

  // Assert
  await expect(page.locator("[data-status]")).toHaveText("Logged in.");

  const loginSession = (await context.cookies()).find(
    (cookie) => cookie.name === "session_token",
  );
  expect(loginSession).toBeDefined();
  expect(loginSession?.value).not.toBe(signupSession?.value);
});
