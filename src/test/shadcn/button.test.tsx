import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { ArrowUpIcon } from "lucide-react";

import "shadcn-test/src/index.css";
import { ThemeProvider } from "shadcn-test/src/components/theme-provider";
import { Button } from "shadcn-test/src/components/ui/button";

function ButtonDemo() {
  return (
    <ThemeProvider>
      <section className="flex  items-center gap-2 p-8" data-testid="button-demo">
        <Button variant="outline">Button</Button>
        <Button variant="outline" size="icon" aria-label="Submit">
          <ArrowUpIcon />
        </Button>
      </section>
    </ThemeProvider>
  );
}

test("shadcn button demo renders and matches a screenshot", async () => {
  const screen = await render(<ButtonDemo />);

  await expect.element(screen.getByText("Button")).toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  await expect.element(page.getByTestId("button-demo")).toMatchScreenshot("shadcn-button-demo");
});
