import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: "list",
  testDir: "test/e2e",
  use: {
    baseURL: "http://localhost",
    trace: "retain-on-failure",
  },
});
