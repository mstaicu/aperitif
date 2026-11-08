import { expect, test } from "@playwright/test";

test("signs up, creates an account, and sees it as an owner", async ({
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();
  await page.goto("/identity/signup?return_to=%2Fidentity%2Flogin");

  // Act
  await page.getByRole("button", { name: "Sign up with passkey" }).click();
  await expect(page).toHaveURL("/identity/login");
  const { accounts } = await page.evaluate(async () => {
    await fetch("/identity/accounts", {
      body: JSON.stringify({ name: "My account" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return (await fetch("/identity/accounts")).json();
  });

  // Assert
  expect(accounts).toEqual([
    expect.objectContaining({
      name: "My account",
      roles: ["account.owner"],
    }),
  ]);
});

test("logs out, loses access, and logs back in to the same identity", async ({
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();
  await page.goto("/identity/signup?return_to=%2Fidentity%2Flogin");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();
  await expect(page).toHaveURL("/identity/login");
  const before = await page.evaluate(async () =>
    (await fetch("/identity/passkeys")).json(),
  );

  // Act
  const signedOut = await page.evaluate(async () => {
    await fetch("/identity/logout", { method: "POST" });
    return (await fetch("/identity/passkeys")).status;
  });
  await page.goto("/identity/login?return_to=%2Fidentity%2Fsignup");
  await page.getByRole("button", { name: "Log in with passkey" }).click();
  await expect(page).toHaveURL("/identity/signup");
  const after = await page.evaluate(async () =>
    (await fetch("/identity/passkeys")).json(),
  );

  // Assert
  expect(signedOut).toBe(403);
  expect(before.passkeys).toHaveLength(1);
  expect(after.passkeys).toEqual(before.passkeys);
});

test("explains when the browser cannot use passkeys", async ({ page }) => {
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
