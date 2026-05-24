import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";

import "shadcn-compiled/tailwind.css";
import "shadcn-compiled/globals.css";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "shadcn-compiled/tabs.tsx";

import { Example } from "./example.tsx";

function TabsDefault() {
  return (
    <Example title="Default">
      <Tabs defaultValue="account" className="w-full max-w-sm">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p className="text-sm text-muted-foreground">Make changes to your account here.</p>
        </TabsContent>
        <TabsContent value="password">
          <p className="text-sm text-muted-foreground">Change your password here.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

function TabsSecondActive() {
  return (
    <Example title="Second Tab Active">
      <Tabs defaultValue="password" className="w-full max-w-sm">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p className="text-sm text-muted-foreground">Make changes to your account here.</p>
        </TabsContent>
        <TabsContent value="password">
          <p className="text-sm text-muted-foreground">Change your password here.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

function TabsThreeTabs() {
  return (
    <Example title="Three Tabs">
      <Tabs defaultValue="overview" className="w-full max-w-sm">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <p className="text-sm text-muted-foreground">Overview of your project.</p>
        </TabsContent>
        <TabsContent value="analytics">
          <p className="text-sm text-muted-foreground">View your analytics data.</p>
        </TabsContent>
        <TabsContent value="reports">
          <p className="text-sm text-muted-foreground">Download your reports.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

function TabsVertical() {
  return (
    <Example title="Vertical">
      <Tabs defaultValue="account" orientation="vertical" className="w-full max-w-sm">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p className="text-sm text-muted-foreground">Account settings.</p>
        </TabsContent>
        <TabsContent value="password">
          <p className="text-sm text-muted-foreground">Change your password.</p>
        </TabsContent>
        <TabsContent value="notifications">
          <p className="text-sm text-muted-foreground">Notification preferences.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

function TabsLineVariant() {
  return (
    <Example title="Line Variant">
      <Tabs defaultValue="overview" className="w-full max-w-sm">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <p className="text-sm text-muted-foreground">Overview of your project.</p>
        </TabsContent>
        <TabsContent value="analytics">
          <p className="text-sm text-muted-foreground">View your analytics data.</p>
        </TabsContent>
        <TabsContent value="reports">
          <p className="text-sm text-muted-foreground">Download your reports.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

function TabsWithDisabled() {
  return (
    <Example title="With Disabled">
      <Tabs defaultValue="active" className="w-full max-w-sm">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="disabled" disabled>
            Disabled
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <p className="text-sm text-muted-foreground">This tab is active.</p>
        </TabsContent>
        <TabsContent value="disabled">
          <p className="text-sm text-muted-foreground">This tab is disabled.</p>
        </TabsContent>
        <TabsContent value="settings">
          <p className="text-sm text-muted-foreground">Settings content.</p>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

test("TabsDefault", async (t) => {
  await render(<TabsDefault />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TabsSecondActive", async (t) => {
  await render(<TabsSecondActive />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TabsThreeTabs", async (t) => {
  await render(<TabsThreeTabs />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TabsVertical", async (t) => {
  await render(<TabsVertical />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TabsLineVariant", async (t) => {
  await render(<TabsLineVariant />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});

test("TabsWithDisabled", async (t) => {
  await render(<TabsWithDisabled />);

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name);
});
