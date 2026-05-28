import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { toast } from "sonner";

import "shadcn-compiled/tailwind.css";
import "shadcn-compiled/globals.css";
import { Toaster } from "shadcn-compiled/sonner.tsx";

test("SonnerDefault", async () => {
  await render(<Toaster />);

  toast("Event has been created");

  const toastEl = page.getByText("Event has been created");
  await expect.element(toastEl).toBeVisible();
});

test("SonnerSuccess", async () => {
  await render(<Toaster />);

  toast.success("Profile updated successfully");

  const toastEl = page.getByText("Profile updated successfully");
  await expect.element(toastEl).toBeVisible();
});

test("SonnerError", async () => {
  await render(<Toaster />);

  toast.error("Something went wrong");

  const toastEl = page.getByText("Something went wrong");
  await expect.element(toastEl).toBeVisible();
});

test("SonnerWarning", async () => {
  await render(<Toaster />);

  toast.warning("Your session is about to expire");

  const toastEl = page.getByText("Your session is about to expire");
  await expect.element(toastEl).toBeVisible();
});

test("SonnerInfo", async () => {
  await render(<Toaster />);

  toast.info("A new software update is available");

  const toastEl = page.getByText("A new software update is available");
  await expect.element(toastEl).toBeVisible();
});

test("SonnerWithDescription", async () => {
  await render(<Toaster />);

  toast("Meeting scheduled", {
    description: "Monday, January 13th at 6:00pm",
  });

  const toastEl = page.getByText("Meeting scheduled");
  await expect.element(toastEl).toBeVisible();
});
