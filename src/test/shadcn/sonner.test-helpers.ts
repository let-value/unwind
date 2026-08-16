import { page } from "vitest/browser";
import { expect, vi } from "vitest";
import { toast } from "sonner";

const TOAST_SELECTOR = "[data-sonner-toast]";

// Sonner keeps its toast store outside of React, so toasts raised by an earlier
// test are still mounted when the next one renders.
export async function resetToasts() {
  toast.dismiss();

  await vi.waitFor(() => {
    if (document.querySelector(TOAST_SELECTOR)) {
      throw new Error("Previous toasts are still mounted");
    }
  });
}

// The `[data-sonner-toaster]` list itself has no layout box of its own, so the
// toast is the element that can actually be captured.
export async function matchToastScreenshot(testName: string) {
  const toast = await vi.waitFor(() => {
    const element = document.querySelector(TOAST_SELECTOR);

    if (!element) {
      throw new Error(`No element matched ${TOAST_SELECTOR}`);
    }

    return page.elementLocator(element);
  });

  await expect.element(toast).toBeVisible();
  await expect.element(toast).toMatchScreenshot(testName);
}
