import { describe, expect, it } from "vitest";
import { compileClasses, normalizeClassTokens } from "../compile.ts";

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

describe(normalizeClassTokens, () => {
  it("deduplicates and trims class tokens", () => {
    expect(normalizeClassTokens("  p-4  hover:bg-blue-600 p-4 ")).toEqual([
      "p-4",
      "hover:bg-blue-600",
    ]);
  });
});

describe(compileClasses, () => {
  it("emits rewritten utilities under the requested selector", async () => {
    const { local } = await compileClasses({
      classNames: "p-4 hover:bg-blue-600 before:block",
      outputSelector: ".card",
    });

    const css = local.toString();

    expect(css).toContain(".card");
    expect(css).toContain(".card:hover");
    expect(css).toContain(".card::before");
    expect(css).toContain("padding:");
    expect(css).toContain("display: block");
  });

  it("merges duplicate nested variant selectors", async () => {
    const { local } = await compileClasses({
      classNames: "hover:text-red-500 hover:bg-blue-600",
      outputSelector: ".card",
    });

    const css = local.toString();

    expect((css.match(/\.card:hover/g) ?? []).length).toBe(1);
    expect(css).toContain("color:");
    expect(css).toContain("background-color:");
  });

  for (const testCase of finalCases) {
    it(`snapshots ${testCase.name}`, async () => {
      const { local } = await compileClasses(testCase);

      const css = local.toString();

      expect(css.length).toBeGreaterThan(0);
      expect(css).toMatchSnapshot();
    });
  }
});
