import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileTailwindClasses } from "./tailwind-compile.ts";

interface Case {
  name: string;
  classNames: string;
  outputSelector?: string;
  expectedSelectors?: string[];
}

const cases: Case[] = [
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
    expectedSelectors: [".output {", ".output:hover {"],
  },
];

describe("compileTailwindClasses", () => {
  for (const testCase of cases) {
    it(`snapshots ${testCase.name}`, async (t) => {
      const css = await compileTailwindClasses(
        testCase.classNames,
        testCase.outputSelector ?? ".output",
      );

      assert.ok(css.length > 0);

      for (const selector of testCase.expectedSelectors ?? []) {
        assert.ok(css.includes(selector));
      }

      t.assert.snapshot(css);
    });
  }
});
