import { render } from "vitest-browser-react";
import { beforeEach, test } from "vitest";
import { toast } from "sonner";

import "shadcn-test/src/index.css";
import { ThemeProvider } from "shadcn-test/src/components/theme-provider.tsx";
import { Toaster } from "shadcn-test/src/components/ui/sonner.tsx";

import { matchToastScreenshot, resetToasts } from "./sonner.test-helpers.ts";

beforeEach(resetToasts);

test("SonnerDefault", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast("Event has been created");

  await matchToastScreenshot(t.task.name);
});

test("SonnerSuccess", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast.success("Profile updated successfully");

  await matchToastScreenshot(t.task.name);
});

test("SonnerError", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast.error("Something went wrong");

  await matchToastScreenshot(t.task.name);
});

test("SonnerWarning", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast.warning("Your session is about to expire");

  await matchToastScreenshot(t.task.name);
});

test("SonnerInfo", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast.info("A new software update is available");

  await matchToastScreenshot(t.task.name);
});

test("SonnerWithDescription", async (t) => {
  await render(
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>,
  );

  toast("Meeting scheduled", {
    description: "Monday, January 13th at 6:00pm",
  });

  await matchToastScreenshot(t.task.name);
});
