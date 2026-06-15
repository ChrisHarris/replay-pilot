import { expect, test } from "@playwright/test";

test("target app loads", async ({ page, baseURL }) => {
  await page.goto(baseURL || "/");
  await expect(page.locator("body")).toBeVisible();
});
