import { describe, expect, it, vi } from "vitest";
import { compileClasses, compileTailwindTargets, normalizeClassTokens } from "../compile.ts";

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

  it("rewrites self group references to the output selector", async () => {
    const { local } = await compileClasses({
      classNames: "group/drawer-content group-data-[state=open]/drawer-content:block",
      outputSelector: ".drawer-content",
    });

    const css = local.toString();

    expect(css).toContain(".drawer-content");
    expect(css).not.toContain(".group\\/drawer-content");
  });

  it("rewrites named group references across targets", async () => {
    const { local } = await compileTailwindTargets({
      targets: [
        {
          node: {} as never,
          source: "className",
          classNames: "group/drawer-content",
          breadcrumbs: [],
          outputSelector: ".drawer-content-group",
        },
        {
          node: {} as never,
          source: "className",
          classNames: "group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center",
          breadcrumbs: [],
          outputSelector: ".drawer-header",
        },
      ],
    });

    const css = local.toString();

    expect(css).toContain(".drawer-header");
    expect(css).toContain(".drawer-content-group");
    expect(css).not.toContain(".group\\/drawer-content");
  });

  it("marks arbitrary selector class references as global", async () => {
    const { local, global } = await compileClasses({
      classNames: "[.border-b]:pb-6",
      outputSelector: ".card-header",
    });

    const css = local.toString();
    const globalCss = global.toString();

    expect(css).toContain(".card-header:is(:global(.border-b))");
    expect(globalCss).toContain(".border-b");
    expect(globalCss).toContain("border-bottom-width:");
  });

  it("rewrites named group references for arbitrary selector variants across targets", async () => {
    const { local } = await compileTailwindTargets({
      targets: [
        {
          node: {} as never,
          source: "className",
          classNames: "group/card",
          breadcrumbs: [],
          outputSelector: ".card",
        },
        {
          node: {} as never,
          source: "className",
          classNames: "group-data-[size=sm]/card:[.border-b]:pb-4",
          breadcrumbs: [],
          outputSelector: ".card-header",
        },
      ],
    });

    const css = local.toString();

    expect(css).toContain(
      '.card-header:is(:where(.card)[data-size="sm"] *):is(:global(.border-b))',
    );
    expect(css).not.toContain(".group\\/card");
  });

  it("warns when requested class tokens do not produce CSS", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await compileClasses({
        classNames: "bg-not-in-theme",
        outputSelector: ".missing",
      });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Tailwind did not generate CSS"));
    } finally {
      warn.mockRestore();
    }
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
