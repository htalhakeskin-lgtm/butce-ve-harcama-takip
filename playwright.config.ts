import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (testing standard). Locally they reuse a running server on :3000;
 * in CI they start the production build with test-only switches:
 * AUTH_RATE_LIMIT=off, PASSWORD_BREACH_CHECK=off, EMAIL_TRANSPORT=file.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      AUTH_RATE_LIMIT: "off",
      PASSWORD_BREACH_CHECK: "off",
      EMAIL_TRANSPORT: "file",
    },
  },
});
