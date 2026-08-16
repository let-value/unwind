import { render } from "vitest-browser-react";
import { beforeEach, test } from "vitest";
import { toast } from "sonner";

import "shadcn-compiled/tailwind.css";
import "shadcn-compiled/globals.css";
import { Toaster } from "shadcn-compiled/sonner.tsx";

import { matchToastScreenshot, resetToasts } from "./sonner.test-helpers.ts";

beforeEach(resetToasts);

test("SonnerDefault", async (t) => {
  await render(<Toaster />);

  toast("Event has been created");

  await matchToastScreenshot(t.task.name);
});

test("SonnerSuccess", async (t) => {
  await render(<Toaster />);

  toast.success("Profile updated successfully");

  await matchToastScreenshot(t.task.name);
});

test("SonnerError", async (t) => {
  await render(<Toaster />);

  toast.error("Something went wrong");

  await matchToastScreenshot(t.task.name);
});

test("SonnerWarning", async (t) => {
  await render(<Toaster />);

  toast.warning("Your session is about to expire");

  await matchToastScreenshot(t.task.name);
});

test("SonnerInfo", async (t) => {
  await render(<Toaster />);

  toast.info("A new software update is available");

  await matchToastScreenshot(t.task.name);
});

test("SonnerWithDescription", async (t) => {
  await render(<Toaster />);

  toast("Meeting scheduled", {
    description: "Monday, January 13th at 6:00pm",
  });

  await matchToastScreenshot(t.task.name);
});
