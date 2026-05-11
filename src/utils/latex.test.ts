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

  it("renders hats and quad spacing", () => {
    expect(latexToMathML("\\hat y_i \\quad x^2")).toContain(
      "<mrow><msub><mover><mi>y</mi><mo>^</mo></mover><mi>i</mi></msub><mspace width=\"0.35em\" /><mspace width=\"1em\" /><mspace width=\"0.35em\" /><msup><mi>x</mi><mn>2</mn></msup></mrow>"
    );
  });

  it("renders standalone empty braces after quad", () => {
    expect(latexToMathML("x \\quad {}")).toContain(
      "<mrow><mi>x</mi><mspace width=\"0.35em\" /><mspace width=\"1em\" /><mspace width=\"0.35em\" /><mrow><mo>{</mo><mo>}</mo></mrow></mrow>"
    );
  });

  it("renders cross-entropy style formulas", () => {
    const math = latexToMathML(
      "\\frac{1}{N}\\sum_{i=1}^{N}\\left[-y_i\\log(\\hat y_i)-(1-y_i)\\log(1-\\hat y_i)\\right]"
    );

    expect(math).toContain("<mfrac><mn>1</mn><mi>N</mi></mfrac>");
    expect(math).toContain("<msubsup><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></msubsup>");
    expect(math).toContain("<msub><mover><mi>y</mi><mo>^</mo></mover><mi>i</mi></msub>");
    expect(math).toContain("<mi>log</mi>");
  });

  it("renders gradient and variance formulas with quad spacing", () => {
    const gradient = latexToMathML(
      "g=\\frac{1}{N}\\sum_{i=1}^{N}\\nabla_{\\theta}L_i(\\theta),\\quad \\theta_{t+1}=\\theta_t-\\eta g"
    );
    const variance = latexToMathML(
      "\\sigma^2=\\frac{1}{N}\\sum_{i=1}^{N}(x_i-\\mu)^2,\\quad \\mu=\\frac{1}{N}\\sum_{i=1}^{N}x_i"
    );

    expect(gradient).toContain("<mspace width=\"1em\" />");
    expect(gradient).toContain("<msub><mo>∇</mo><mi>θ</mi></msub>");
    expect(gradient).toContain("<msub><mi>θ</mi><mrow><mi>t</mi><mo>+</mo><mn>1</mn></mrow></msub>");
    expect(variance).toContain("<msup><mi>σ</mi><mn>2</mn></msup>");
    expect(variance).toContain("<msup><mrow><mo>(</mo>");
    expect(variance).toContain("<msub><mi>x</mi><mi>i</mi></msub><mo>-</mo><mi>μ</mi>");
    expect(variance).toContain("<mo>)</mo></mrow><mn>2</mn></msup>");
  });

  it("escapes regular text while preserving generated math markup", () => {
    const html = renderNodeNameHtml("<script> $\\alpha + \\beta$");

    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<mi>α</mi>");
    expect(html).toContain("<mi>β</mi>");
  });
});
