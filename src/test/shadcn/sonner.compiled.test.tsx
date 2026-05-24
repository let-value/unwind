import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { toast } from "sonner";

import "shadcn-compiled/tailwind.css";
import "shadcn-compiled/globals.css";
import { Toaster } from "shadcn-compiled/sonner.tsx";

test("SonnerDefault", async (t) => {
  await render(<Toaster />);

  toast("Event has been created");

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});

test("SonnerSuccess", async (t) => {
  await render(<Toaster />);

  toast.success("Profile updated successfully");

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});

test("SonnerError", async (t) => {
  await render(<Toaster />);

  toast.error("Something went wrong");

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});

test("SonnerWarning", async (t) => {
  await render(<Toaster />);

  toast.warning("Your session is about to expire");

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});

test("SonnerInfo", async (t) => {
  await render(<Toaster />);

  toast.info("A new software update is available");

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});

test("SonnerWithDescription", async (t) => {
  await render(<Toaster />);

  toast("Meeting scheduled", {
    description: "Monday, January 13th at 6:00pm",
  });

  const toastEl = page.locator("[data-sonner-toast]").first();
  await expect.element(toastEl).toBeVisible();
  await expect.element(page.locator("[data-sonner-toaster]")).toMatchScreenshot(t.task.name);
});
