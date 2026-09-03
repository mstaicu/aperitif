import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: "list",
  testDir: "test/e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://tma.com",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
});
