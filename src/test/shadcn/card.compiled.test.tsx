import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";

import "shadcn-compiled/tailwind.css";
import "shadcn-compiled/globals.css";
import { Button } from "shadcn-compiled/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "shadcn-compiled/card.tsx";

import { Example, IconPlaceholder } from "./example.tsx";

const LANDSCAPE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%230f766e'/%3E%3Cstop offset='100%25' stop-color='%231e3a8a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3Ccircle cx='520' cy='90' r='42' fill='%23fbbf24'/%3E%3Cpath d='M0 270 L120 180 L230 250 L330 170 L460 260 L640 160 L640 360 L0 360 Z' fill='%23064e3b'/%3E%3C/svg%3E";

function CardLogin() {
  return (
    <Example title="Login">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="h-9 rounded-md border px-3"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <label htmlFor="password">Password</label>
                  <a
                    href="#"
                    className="ml-auto inline-block underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="h-9 rounded-md border px-3"
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full">
            Login
          </Button>
          <Button variant="outline" className="w-full">
            Login with Google
          </Button>
          <div className="mt-4 text-center">
            Don&apos;t have an account?{" "}
            <a href="#" className="underline underline-offset-4">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardMeetingNotes() {
  return (
    <Example title="Meeting Notes">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
          <CardDescription>Transcript from the meeting with the client.</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              <IconPlaceholder
                lucide="CaptionsIcon"
                tabler="IconTextCaption"
                hugeicons="TextCheckIcon"
                phosphor="TextTIcon"
                remixicon="RiTextWrap"
                data-icon="inline-start"
              />
              Transcribe
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>
            Client requested dashboard redesign with focus on mobile responsiveness.
          </p>
          <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6">
            <li>New analytics widgets for daily/weekly metrics</li>
            <li>Simplified navigation menu</li>
            <li>Dark mode support</li>
            <li>Timeline: 6 weeks</li>
            <li>Follow-up meeting scheduled for next Tuesday</li>
          </ol>
        </CardContent>
        <CardFooter>
          <div className="flex -space-x-2">
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs">
              CN
            </div>
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs">
              LR
            </div>
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs">
              ER
            </div>
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs">
              +8
            </div>
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardWithImage() {
  return (
    <Example title="With Image">
      <Card
        size="default"
        className="relative mx-auto w-full max-w-sm"
        style={{ paddingTop: 0 }}
      >
        <div className="absolute inset-0 z-30 aspect-video bg-primary opacity-50 mix-blend-color" />
        <img
          src={LANDSCAPE_IMAGE}
          alt="Landscape"
          title="Landscape"
          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
        />
        <CardHeader>
          <CardTitle>Beautiful Landscape</CardTitle>
          <CardDescription>
            A stunning view that captures the essence of natural beauty.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full">
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="Add01Icon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
              data-icon="inline-start"
            />
            Button
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardWithImageSmall() {
  return (
    <Example title="With Image (Small)">
      <Card size="sm" className="relative mx-auto w-full max-w-sm pt-0">
        <div className="absolute inset-0 z-30 aspect-video bg-primary opacity-50 mix-blend-color" />
        <img
          src={LANDSCAPE_IMAGE}
          alt="Landscape"
          title="Landscape"
          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
        />
        <CardHeader>
          <CardTitle>Beautiful Landscape</CardTitle>
          <CardDescription>
            A stunning view that captures the essence of natural beauty.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button size="sm" className="w-full">
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="Add01Icon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
              data-icon="inline-start"
            />
            Button
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardHeaderWithBorder() {
  return (
    <Example title="Header with Border">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="border-b">
          <CardTitle>Header with Border</CardTitle>
          <CardDescription>
            This is a card with a header that has a bottom border.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The header has a border-b class applied, creating a visual separation between
            the header and content sections.
          </p>
        </CardContent>
      </Card>
    </Example>
  );
}

function CardFooterWithBorder() {
  return (
    <Example title="Footer with Border">
      <Card className="mx-auto w-full max-w-sm">
        <CardContent>
          <p>
            The footer has a border-t class applied, creating a visual separation between
            the content and footer sections.
          </p>
        </CardContent>
        <CardFooter className="border-t">
          <Button variant="outline" className="w-full">
            Footer with Border
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardDefault() {
  return (
    <Example title="Default Size">
      <Card size="default" className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>This card uses the default size variant.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The card component supports a size prop that defaults to &quot;default&quot;
            for standard spacing and sizing.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Action
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardSmall() {
  return (
    <Example title="Small Size">
      <Card size="sm" className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Small Card</CardTitle>
          <CardDescription>This card uses the small size variant.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The card component supports a size prop that can be set to &quot;sm&quot; for
            a more compact appearance.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            Action
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardHeaderWithBorderSmall() {
  return (
    <Example title="Header with Border (Small)">
      <Card size="sm" className="mx-auto w-full max-w-sm">
        <CardHeader className="border-b">
          <CardTitle>Header with Border</CardTitle>
          <CardDescription>
            This is a small card with a header that has a bottom border.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The header has a border-b class applied, creating a visual separation between
            the header and content sections.
          </p>
        </CardContent>
      </Card>
    </Example>
  );
}

function CardFooterWithBorderSmall() {
  return (
    <Example title="Footer with Border (Small)">
      <Card size="sm" className="mx-auto w-full max-w-sm">
        <CardContent>
          <p>
            The footer has a border-t class applied, creating a visual separation between
            the content and footer sections.
          </p>
        </CardContent>
        <CardFooter className="border-t">
          <Button variant="outline" size="sm" className="w-full">
            Footer with Border
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

test("CardLogin", async (t) => {
  await render(<CardLogin />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardMeetingNotes", async (t) => {
  await render(<CardMeetingNotes />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardWithImage", async (t) => {
  await render(<CardWithImage />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardWithImageSmall", async (t) => {
  await render(<CardWithImageSmall />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardHeaderWithBorder", async (t) => {
  await render(<CardHeaderWithBorder />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardFooterWithBorder", async (t) => {
  await render(<CardFooterWithBorder />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardDefault", async (t) => {
  await render(<CardDefault />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardSmall", async (t) => {
  await render(<CardSmall />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardHeaderWithBorderSmall", async (t) => {
  await render(<CardHeaderWithBorderSmall />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("CardFooterWithBorderSmall", async (t) => {
  await render(<CardFooterWithBorderSmall />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});
