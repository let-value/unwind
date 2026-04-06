import { render } from "vitest-browser-react";
import { test } from "vitest";

import "shadcn-test/src/index.css";
import { ThemeProvider } from "shadcn-test/src/components/theme-provider.tsx";
import { Button } from "shadcn-test/src/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "shadcn-test/src/components/ui/drawer";

import { openDrawerAndMatchScreenshot } from "./drawer.test-helpers.ts";

const DRAWER_SIDES = ["top", "right", "bottom", "left"] as const;

function DrawerParagraphs() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <p
          key={index}
          className="mb-4 leading-normal style-lyra:mb-2 style-lyra:leading-relaxed"
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
          fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </p>
      ))}
    </>
  );
}

function DrawerWithSides() {
  return (
    <div className="flex flex-col gap-2 p-2" data-testid="example">
      <h1 className="text-2xl font-bold">Sides</h1>
      <div className="flex flex-wrap gap-2">
        {DRAWER_SIDES.map((side) => (
          <Drawer
            key={side}
            direction={side === "bottom" ? undefined : side}
          >
            <DrawerTrigger asChild>
              <Button variant="outline" className="capitalize">
                {side}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Move Goal</DrawerTitle>
                <DrawerDescription>Set your daily activity goal.</DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-4">
                <DrawerParagraphs />
              </div>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ))}
      </div>
    </div>
  );
}

function ScrollableDrawer() {
  return (
    <div className="flex flex-col gap-2 p-2" data-testid="example">
      <h1 className="text-2xl font-bold">Scrollable Content</h1>
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="outline">Scrollable Content</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Move Goal</DrawerTitle>
            <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar overflow-y-auto px-4">
            <DrawerParagraphs />
          </div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

test("DrawerTop", async (t) => {
  await render(
    <ThemeProvider>
      <DrawerWithSides />
    </ThemeProvider>,
  );

  await openDrawerAndMatchScreenshot(t.task.name, "top");
});

test("DrawerRight", async (t) => {
  await render(
    <ThemeProvider>
      <DrawerWithSides />
    </ThemeProvider>,
  );

  await openDrawerAndMatchScreenshot(t.task.name, "right");
});

test("DrawerBottom", async (t) => {
  await render(
    <ThemeProvider>
      <DrawerWithSides />
    </ThemeProvider>,
  );

  await openDrawerAndMatchScreenshot(t.task.name, "bottom");
});

test("DrawerLeft", async (t) => {
  await render(
    <ThemeProvider>
      <DrawerWithSides />
    </ThemeProvider>,
  );

  await openDrawerAndMatchScreenshot(t.task.name, "left");
});

test("DrawerScrollableContent", async (t) => {
  await render(
    <ThemeProvider>
      <ScrollableDrawer />
    </ThemeProvider>,
  );

  await openDrawerAndMatchScreenshot(t.task.name, "Scrollable Content");
});
