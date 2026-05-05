import { describe, expect, it } from "vitest";
import { latexToMathML, renderNodeNameHtml, splitLatexSegments } from "./latex";

describe("latex node names", () => {
  it("splits regular text and latex delimiters", () => {
    expect(splitLatexSegments("Energy $E=mc^2$ node")).toEqual([
      { kind: "text", value: "Energy " },
      { kind: "math", value: "E=mc^2", display: false },
      { kind: "text", value: " node" },
    ]);
  });

  it("renders common latex constructs as mathml", () => {
    expect(latexToMathML("\\frac{x_1}{\\sqrt{y}}")).toContain(
      "<mfrac><msub><mi>x</mi><mn>1</mn></msub><msqrt><mi>y</mi></msqrt></mfrac>"
    );
  });

  it("escapes regular text while preserving generated math markup", () => {
    const html = renderNodeNameHtml("<script> $\\alpha + \\beta$");

    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<mi>α</mi>");
    expect(html).toContain("<mi>β</mi>");
  });
});
