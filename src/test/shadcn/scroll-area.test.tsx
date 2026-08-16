import * as React from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";

import "shadcn-test/src/index.css";
import { ThemeProvider } from "shadcn-test/src/components/theme-provider.tsx";
import { ScrollArea, ScrollBar } from "shadcn-test/src/components/ui/scroll-area.tsx";

import { Example } from "./example.tsx";

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

const works = [
  {
    artist: "Ornella Binni",
    art: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%23dbeafe'/%3E%3Ccircle cx='70' cy='90' r='40' fill='%2393c5fd'/%3E%3Cpath d='M0 320 L70 250 L150 300 L230 240 L300 320 L300 400 L0 400 Z' fill='%233b82f6'/%3E%3C/svg%3E",
  },
  {
    artist: "Tom Byrom",
    art: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%23dcfce7'/%3E%3Crect x='30' y='40' width='240' height='150' rx='24' fill='%2386efac'/%3E%3Ccircle cx='220' cy='290' r='55' fill='%2322c55e'/%3E%3C/svg%3E",
  },
  {
    artist: "Vladimir Malyav",
    art: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%23fee2e2'/%3E%3Cpath d='M20 360 L150 60 L280 360 Z' fill='%23f87171'/%3E%3Crect x='115' y='180' width='70' height='120' fill='%23dc2626'/%3E%3C/svg%3E",
  },
] as const;

function ScrollAreaVertical() {
  return (
    <Example title="Vertical">
      <ScrollArea
        style={{
          height: "18rem",
          width: "12rem",
          marginInline: "auto",
          borderRadius: "0.375rem",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: "1rem" }}>
          <h4 style={{ marginBottom: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>Tags</h4>
          {tags.map((tag) => (
            <React.Fragment key={tag}>
              <div style={{ fontSize: "0.875rem" }}>{tag}</div>
              <div
                style={{
                  marginBlock: "0.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              />
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </Example>
  );
}

function ScrollAreaHorizontal() {
  return (
    <Example title="Horizontal">
      <ScrollArea
        style={{
          width: "100%",
          maxWidth: "24rem",
          marginInline: "auto",
          borderRadius: "0.375rem",
          border: "1px solid var(--border)",
          padding: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          {works.map((artwork) => (
            <figure key={artwork.artist} style={{ flexShrink: 0 }}>
              <div style={{ overflow: "hidden", borderRadius: "0.375rem" }}>
                <img
                  src={artwork.art}
                  alt={`Photo by ${artwork.artist}`}
                  width={300}
                  height={400}
                  style={{ display: "block", width: "300px", height: "400px", objectFit: "cover" }}
                />
              </div>
              <figcaption
                style={{
                  paddingTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                }}
              >
                Photo by{" "}
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                  {artwork.artist}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Example>
  );
}

test("ScrollAreaVertical", async (t) => {
  await render(
    <ThemeProvider>
      <ScrollAreaVertical />
    </ThemeProvider>,
  );

  const viewport = document.querySelector('[data-slot="scroll-area-viewport"]');
  expect(viewport).toBeTruthy();
  if (viewport instanceof HTMLElement) {
    viewport.scrollTop = Math.floor((viewport.scrollHeight - viewport.clientHeight) * 0.6);
    viewport.dispatchEvent(new Event("scroll"));
  }

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name, {
    comparatorOptions: {
      allowedMismatchedPixelRatio: 0.03,
    },
  });
});

test("ScrollAreaHorizontal", async (t) => {
  await render(
    <ThemeProvider>
      <ScrollAreaHorizontal />
    </ThemeProvider>,
  );

  const viewport = document.querySelector('[data-slot="scroll-area-viewport"]');
  expect(viewport).toBeTruthy();
  if (viewport instanceof HTMLElement) {
    viewport.scrollLeft = Math.floor((viewport.scrollWidth - viewport.clientWidth) * 0.55);
    viewport.dispatchEvent(new Event("scroll"));
  }

  await expect.element(page.getByTestId("example")).toMatchScreenshot(t.task.name, {
    comparatorOptions: {
      allowedMismatchedPixelRatio: 0.03,
    },
  });
});
