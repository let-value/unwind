import { page } from "vitest/browser";
import { expect } from "vitest";

export async function openDrawerAndMatchScreenshot(testName: string, triggerName: string) {
  await page.getByRole("button", { name: triggerName }).click();
  const drawer = page.getByRole("dialog");
  await expect.element(drawer).toBeVisible();
  // Text antialiasing alone moves ~2% of the pixels in a drawer this full of
  // copy, so the comparison has to sit above that noise floor.
  await expect.element(drawer).toMatchScreenshot(testName, {
    comparatorOptions: { allowedMismatchedPixelRatio: 0.05 },
  });
}
