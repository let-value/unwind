import { page } from "vitest/browser";
import { expect } from "vitest";

export async function openDrawerAndMatchScreenshot(testName: string, triggerName: string) {
  await page.getByRole("button", { name: triggerName }).click();
  const drawer = page.getByRole("dialog");
  await expect.element(drawer).toBeVisible();
  await expect.element(drawer).toMatchScreenshot(testName);
}
