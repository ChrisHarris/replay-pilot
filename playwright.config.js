import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/scenarios",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.REPLAYPILOT_TARGET_URL || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: {
      width: Number(process.env.REPLAYPILOT_VIEWPORT_WIDTH || 393),
      height: Number(process.env.REPLAYPILOT_VIEWPORT_HEIGHT || 852)
    }
  }
});
