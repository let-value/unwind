import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compileTailwindClasses,
  compileTailwindUtilities,
  finalizeTailwindCss,
  normalizeClassTokens,
  replaceTailwindSelectors,
} from "./tailwind-compile.ts";

function snapshotCss(css: string): string[] {
  return css.split("\n");
}

describe("normalizeClassTokens", () => {
  it("deduplicates and trims class tokens", () => {
    assert.deepEqual(normalizeClassTokens("  p-4  hover:bg-blue-600 p-4 "), [
      "p-4",
      "hover:bg-blue-600",
    ]);
  });
});

describe("compileTailwindUtilities", () => {
  it("snapshots the raw Tailwind output", async (t) => {
    const css = await compileTailwindUtilities("p-4 hover:bg-blue-600 before:block");

    assert.ok(css.includes(".p-4"));
    assert.ok(css.includes(".hover\\:bg-blue-600"));
    assert.ok(css.includes(".before\\:block"));
    t.assert.snapshot(snapshotCss(css));
  });
});

describe("replaceTailwindSelectors", () => {
  it("snapshots selector replacement output before finalization", async (t) => {
    const compiledCss = await compileTailwindUtilities("p-4 hover:bg-blue-600 before:block");
    const rewrittenCss = replaceTailwindSelectors(compiledCss, "p-4 hover:bg-blue-600 before:block", ".card");

    assert.ok(rewrittenCss.includes(".card"));
    assert.ok(rewrittenCss.includes("&:hover"));
    assert.ok(rewrittenCss.includes("&::before"));
    t.assert.snapshot(snapshotCss(rewrittenCss));
  });
});

describe("finalizeTailwindCss", () => {
  it("snapshots deduped nested CSS", async (t) => {
    const compiledCss = await compileTailwindUtilities("p-4 hover:bg-blue-600 before:block");
    const rewrittenCss = replaceTailwindSelectors(compiledCss, "p-4 hover:bg-blue-600 before:block", ".card");
    const finalizedCss = finalizeTailwindCss(rewrittenCss);

    assert.ok(finalizedCss.includes("&:hover"));
    assert.ok(finalizedCss.includes("&::before"));
    t.assert.snapshot(snapshotCss(finalizedCss));
  });

  it("merges duplicate nested variant selectors", () => {
    const finalizedCss = finalizeTailwindCss(`
.card {
  &:hover {
    color: red;
  }
}

.card {
  &:hover {
    background: blue;
  }
}
`);

    assert.equal((finalizedCss.match(/&:hover/g) ?? []).length, 1);
    assert.ok(finalizedCss.includes("color: red"));
    assert.ok(finalizedCss.includes("background: blue"));
  });
});

interface FinalCase {
  name: string;
  classNames: string;
  outputSelector?: string;
  expectedSelectors?: string[];
}

const finalCases: FinalCase[] = [
  {
    name: "single utility",
    classNames: "p-4",
    outputSelector: ".output",
  },
  {
    name: "merged utilities",
    classNames: "p-4 bg-blue-500",
    outputSelector: ".output",
  },
  {
    name: "custom selector",
    classNames: "text-sm font-medium",
    outputSelector: ".compiled",
  },
  {
    name: "regular and hover utilities",
    classNames: "p-4 hover:bg-blue-600",
    outputSelector: ".output",
    expectedSelectors: [".output {", "&:hover", "@media (hover: hover) {"],
  },
  {
    name: "compound variants and pseudo elements",
    classNames: "before:block sm:hover:text-red-500",
    outputSelector: "[data-ui]",
    expectedSelectors: ["&::before", "&:hover", "@media (width >= 40rem) {"],
  },
];

describe("compileTailwindClasses", () => {
  for (const testCase of finalCases) {
    it(`snapshots ${testCase.name}`, async (t) => {
      const css = await compileTailwindClasses(
        testCase.classNames,
        testCase.outputSelector ?? ".output",
      );

      assert.ok(css.length > 0);

      for (const selector of testCase.expectedSelectors ?? []) {
        assert.ok(css.includes(selector));
      }

      t.assert.snapshot(snapshotCss(css));
    });
  }
});
