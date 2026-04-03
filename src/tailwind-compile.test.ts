import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compileTailwindClasses,
  normalizeClassTokens,
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

  },
  {
    name: "compound variants and pseudo elements",
    classNames: "before:block sm:hover:text-red-500",
    outputSelector: "[data-ui]",
  },
];

describe("compileTailwindClasses", () => {
  it("emits rewritten utilities under the requested selector", async (t) => {
    const css = await compileTailwindClasses("p-4 hover:bg-blue-600 before:block", ".card");

    assert.ok(css.includes(".card"));
    assert.ok(css.includes(".card:hover"));
    assert.ok(css.includes(".card::before"));
    assert.ok(css.includes("padding:"));
    assert.ok(css.includes("display: block"));
  });

  it("merges duplicate nested variant selectors", async () => {
    const css = await compileTailwindClasses("hover:text-red-500 hover:bg-blue-600", ".card");

    assert.equal((css.match(/\.card:hover/g) ?? []).length, 1);
    assert.ok(css.includes("color:"));
    assert.ok(css.includes("background-color:"));
  });

  for (const testCase of finalCases) {
    it(`snapshots ${testCase.name}`, async (t) => {
      const css = await compileTailwindClasses(
        testCase.classNames,
        testCase.outputSelector ?? ".output",
      );

      assert.ok(css.length > 0);


      t.assert.snapshot(snapshotCss(css));
    });
  }
});
