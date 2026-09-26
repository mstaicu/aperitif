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

test("a signed-in person can add and manage another passkey", async ({
  browser,
  context,
  page,
}) => {
  // Arrange
  await context.credentials.install();
  await page.goto("/signup?return_to=%2Flogin");
  await page.getByRole("button", { name: "Sign up with passkey" }).click();
  await expect(page).toHaveURL("/login");

  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "session_token",
  );
  expect(session).toBeDefined();

  const secondContext = await browser.newContext();
  await secondContext.credentials.install();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/login");

  // Act
  const added = await secondPage.evaluate(async (sessionToken) => {
    const importMap = JSON.parse(
      document.querySelector('script[type="importmap"]').textContent,
    );
    const { startRegistration } = await import(
      Object.values(importMap.scopes)[0]["@simplewebauthn/browser"]
    );
    const options = await fetch("/v1/passkeys/options", {
      headers: { Authorization: `Bearer ${sessionToken}` },
      method: "POST",
    });
    const credential = await startRegistration({
      optionsJSON: await options.json(),
    });
    const response = await fetch("/v1/passkeys", {
      body: JSON.stringify({ credential, name: "Work passkey" }),
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return { body: await response.json(), status: response.status };
  }, session.value);
  await secondContext.close();
  const listed = await context.request.get("/v1/passkeys", {
    headers: { Authorization: `Bearer ${session.value}` },
  });
  const { passkeys } = await listed.json();
  const firstPasskey = passkeys.find(({ name }) => name === "Passkey");

  // Assert
  expect(added.status).toBe(201);
  expect(added.body.name).toBe("Work passkey");
  expect(listed.status()).toBe(200);
  expect(passkeys).toHaveLength(2);
  expect(firstPasskey).toBeDefined();

  const renamed = await context.request.patch(`/v1/passkeys/${added.body.id}`, {
    data: { name: "Work MacBook" },
    headers: { Authorization: `Bearer ${session.value}` },
  });
  expect(renamed.status()).toBe(200);
  expect((await renamed.json()).name).toBe("Work MacBook");

  const removed = await context.request.delete(
    `/v1/passkeys/${firstPasskey.id}`,
    { headers: { Authorization: `Bearer ${session.value}` } },
  );
  expect(removed.status()).toBe(204);

  const finalRemoval = await context.request.delete(
    `/v1/passkeys/${added.body.id}`,
    { headers: { Authorization: `Bearer ${session.value}` } },
  );
  expect(finalRemoval.status()).toBe(409);
  expect((await finalRemoval.json()).type).toBe(
    "/problems/last-authentication-method",
  );
});
