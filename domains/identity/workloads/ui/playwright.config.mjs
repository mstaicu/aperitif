import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: "list",
  testDir: "test/e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost",
    trace: "retain-on-failure",
  },
});
