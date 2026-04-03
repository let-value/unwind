import assert from "node:assert/strict";
import jscodeshift from "jscodeshift";
import { describe, it } from "node:test";
import { transform } from "./transform.ts";
import { createTransformTargets } from "./transform-targets.ts";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";

describe("transform", () => {
  it("extracts classes, assigns selectors, and compiles combined css output", async () => {
    const source = `
      import { cva } from "class-variance-authority";

      const cardVariants = cva("rounded-md border", {
        variants: {
          size: {
            icon: "size-9",
          },
        },
      });

      function Card() {
        return <div className={isOpen ? "block" : "hidden"} />;
      }
    `;

    const classNames = extractClassNameStringsFromSource(source);
    const targets = createTransformTargets(classNames);

    assert.deepEqual(
      targets.map((target) => target.selectorName),
      ["card", "card-size-icon", "card-open-block", "card-open-hidden"],
    );

    const api = {
      j: jscodeshift.withParser("tsx"),
      jscodeshift: jscodeshift.withParser("tsx"),
      stats: () => { },
      report: () => { },
    };

    const css = await transform({ path: "card.tsx", source }, api);

    assert.ok(css);
    assert.ok(css.includes(".card"));
    assert.ok(css.includes(".card-size-icon"));
    assert.ok(css.includes(".card-open-block"));
    assert.ok(css.includes(".card-open-hidden"));
    assert.ok(css.includes("border-radius:"));
    assert.ok(css.includes("display: block"));
    assert.ok(css.includes("display: none"));
  });
});
