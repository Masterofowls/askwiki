import { expect, test } from "@playwright/test"

test("placeholder e2e test", async ({ page }) => {
  // TODO: Replace with actual e2e tests once a page is available.
  // This is a scaffold placeholder that will be skipped by CI.
  test.skip()
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
})
