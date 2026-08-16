import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";

import "shadcn-test/src/index.css";
import { ThemeProvider } from "shadcn-test/src/components/theme-provider.tsx";
import { Toggle } from "shadcn-test/src/components/ui/toggle.tsx";

import { Example, IconPlaceholder } from "./example.tsx";

function ToggleDefault() {
  return (
    <Example title="Default">
      <Toggle aria-label="Toggle bold">Bold</Toggle>
    </Example>
  );
}

function TogglePressed() {
  return (
    <Example title="Pressed">
      <Toggle defaultPressed aria-label="Toggle bold">
        Bold
      </Toggle>
    </Example>
  );
}

function ToggleOutline() {
  return (
    <Example title="Outline">
      <Toggle variant="outline" aria-label="Toggle italic">
        Italic
      </Toggle>
    </Example>
  );
}

function ToggleOutlinePressed() {
  return (
    <Example title="Outline Pressed">
      <Toggle variant="outline" defaultPressed aria-label="Toggle italic">
        Italic
      </Toggle>
    </Example>
  );
}

function ToggleSizes() {
  return (
    <Example title="Sizes">
      <div className="flex items-center gap-2">
        <Toggle size="sm" aria-label="Toggle small">
          Sm
        </Toggle>
        <Toggle size="default" aria-label="Toggle default">
          Default
        </Toggle>
        <Toggle size="lg" aria-label="Toggle large">
          Lg
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleWithIcon() {
  return (
    <Example title="With Icon">
      <div className="flex items-center gap-2">
        <Toggle aria-label="Toggle bold">
          <IconPlaceholder
            lucide="BoldIcon"
            tabler="IconBold"
            hugeicons="TextBoldIcon"
            phosphor="TextBIcon"
            remixicon="RiBold"
          />
          Bold
        </Toggle>
        <Toggle aria-label="Toggle italic">
          <IconPlaceholder
            lucide="ItalicIcon"
            tabler="IconItalic"
            hugeicons="TextItalicIcon"
            phosphor="TextItalicIcon"
            remixicon="RiItalic"
          />
          Italic
        </Toggle>
        <Toggle aria-label="Toggle underline">
          <IconPlaceholder
            lucide="UnderlineIcon"
            tabler="IconUnderline"
            hugeicons="TextUnderlineIcon"
            phosphor="TextUnderlineIcon"
            remixicon="RiUnderline"
          />
          Underline
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleIconOnly() {
  return (
    <Example title="Icon Only">
      <div className="flex items-center gap-2">
        <Toggle aria-label="Toggle bold">
          <IconPlaceholder
            lucide="BoldIcon"
            tabler="IconBold"
            hugeicons="TextBoldIcon"
            phosphor="TextBIcon"
            remixicon="RiBold"
          />
        </Toggle>
        <Toggle variant="outline" defaultPressed aria-label="Toggle italic">
          <IconPlaceholder
            lucide="ItalicIcon"
            tabler="IconItalic"
            hugeicons="TextItalicIcon"
            phosphor="TextItalicIcon"
            remixicon="RiItalic"
          />
        </Toggle>
        <Toggle aria-label="Toggle underline">
          <IconPlaceholder
            lucide="UnderlineIcon"
            tabler="IconUnderline"
            hugeicons="TextUnderlineIcon"
            phosphor="TextUnderlineIcon"
            remixicon="RiUnderline"
          />
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleDisabled() {
  return (
    <Example title="Disabled">
      <div className="flex items-center gap-2">
        <Toggle disabled aria-label="Toggle bold">
          Bold
        </Toggle>
        <Toggle variant="outline" disabled aria-label="Toggle italic">
          Italic
        </Toggle>
      </div>
    </Example>
  );
}

test("ToggleDefault", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleDefault />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TogglePressed", async (t) => {
  await render(
    <ThemeProvider>
      <TogglePressed />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleOutline", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleOutline />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleOutlinePressed", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleOutlinePressed />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleSizes", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleSizes />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleWithIcon", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleWithIcon />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleIconOnly", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleIconOnly />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("ToggleDisabled", async (t) => {
  await render(
    <ThemeProvider>
      <ToggleDisabled />
    </ThemeProvider>,
  );

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});
