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
  expect(await context.credentials.get({ rpId: "tma.com" })).toHaveLength(1);

  const [signupSession] = await context.cookies();
  expect(signupSession).toMatchObject({ name: "session_token" });

  // Arrange
  await context.clearCookies({ name: "session_token" });

  // Act
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in with passkey" }).click();

  // Assert
  await expect(page.locator("[data-status]")).toHaveText("Logged in.");

  const [loginSession] = await context.cookies();
  expect(loginSession).toMatchObject({ name: "session_token" });
  expect(loginSession.value).not.toBe(signupSession.value);
});
