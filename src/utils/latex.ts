type NameSegment =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "math";
      value: string;
      display: boolean;
    };

const greekCommands = new Map([
  ["alpha", "\u03b1"],
  ["beta", "\u03b2"],
  ["gamma", "\u03b3"],
  ["delta", "\u03b4"],
  ["epsilon", "\u03b5"],
  ["varepsilon", "\u03b5"],
  ["zeta", "\u03b6"],
  ["eta", "\u03b7"],
  ["theta", "\u03b8"],
  ["vartheta", "\u03d1"],
  ["iota", "\u03b9"],
  ["kappa", "\u03ba"],
  ["lambda", "\u03bb"],
  ["mu", "\u03bc"],
  ["nu", "\u03bd"],
  ["xi", "\u03be"],
  ["pi", "\u03c0"],
  ["rho", "\u03c1"],
  ["sigma", "\u03c3"],
  ["tau", "\u03c4"],
  ["upsilon", "\u03c5"],
  ["phi", "\u03c6"],
  ["varphi", "\u03d5"],
  ["chi", "\u03c7"],
  ["psi", "\u03c8"],
  ["omega", "\u03c9"],
  ["Gamma", "\u0393"],
  ["Delta", "\u0394"],
  ["Theta", "\u0398"],
  ["Lambda", "\u039b"],
  ["Xi", "\u039e"],
  ["Pi", "\u03a0"],
  ["Sigma", "\u03a3"],
  ["Phi", "\u03a6"],
  ["Psi", "\u03a8"],
  ["Omega", "\u03a9"],
]);

const operatorCommands = new Map([
  ["times", "\u00d7"],
  ["cdot", "\u22c5"],
  ["pm", "\u00b1"],
  ["mp", "\u2213"],
  ["le", "\u2264"],
  ["leq", "\u2264"],
  ["ge", "\u2265"],
  ["geq", "\u2265"],
  ["neq", "\u2260"],
  ["ne", "\u2260"],
  ["approx", "\u2248"],
  ["sim", "\u223c"],
  ["in", "\u2208"],
  ["notin", "\u2209"],
  ["subset", "\u2282"],
  ["subseteq", "\u2286"],
  ["cup", "\u222a"],
  ["cap", "\u2229"],
  ["to", "\u2192"],
  ["rightarrow", "\u2192"],
  ["leftarrow", "\u2190"],
  ["Rightarrow", "\u21d2"],
  ["Leftarrow", "\u21d0"],
  ["infty", "\u221e"],
  ["partial", "\u2202"],
  ["nabla", "\u2207"],
  ["sum", "\u2211"],
  ["prod", "\u220f"],
  ["int", "\u222b"],
  ["lim", "lim"],
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function splitLatexSegments(value: string): NameSegment[] {
  const segments: NameSegment[] = [];
  let textStart = 0;
  let index = 0;

  const pushText = (end: number) => {
    if (end > textStart) {
      segments.push({ kind: "text", value: value.slice(textStart, end) });
    }
  };

  while (index < value.length) {
    const previous = index > 0 ? value[index - 1] : "";

    if (value.startsWith("\\(", index) || value.startsWith("\\[", index)) {
      const opener = value.slice(index, index + 2);
      const closer = opener === "\\(" ? "\\)" : "\\]";
      const end = value.indexOf(closer, index + 2);
      if (end === -1) {
        index += 2;
        continue;
      }

      pushText(index);
      segments.push({ kind: "math", value: value.slice(index + 2, end), display: opener === "\\[" });
      index = end + 2;
      textStart = index;
      continue;
    }

    if (value[index] === "$" && previous !== "\\") {
      const display = value[index + 1] === "$";
      const openerLength = display ? 2 : 1;
      let end = index + openerLength;

      while (end < value.length) {
        const isClosing = display ? value.startsWith("$$", end) : value[end] === "$";
        if (isClosing && value[end - 1] !== "\\") break;
        end += 1;
      }

      if (end >= value.length) {
        index += openerLength;
        continue;
      }

      pushText(index);
      segments.push({
        kind: "math",
        value: value.slice(index + openerLength, end),
        display,
      });
      index = end + openerLength;
      textStart = index;
      continue;
    }

    index += 1;
  }

  pushText(value.length);
  return segments;
}

class LatexParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse() {
    return this.parseExpression();
  }

  private parseExpression(stop = ""): string {
    const nodes: string[] = [];

    while (this.index < this.input.length) {
      const char = this.input[this.index];
      if (stop && char === stop) break;
      if (char === "}") break;

      if (char === "^" || char === "_") {
        this.index += 1;
        nodes.push(this.operator(char));
        continue;
      }

      const atom = this.parseAtom();
      nodes.push(this.parseScripts(atom));
    }

    return this.row(nodes);
  }

  private parseAtom(): string {
    const char = this.input[this.index];

    if (!char) return "";

    if (char === "{") {
      return this.parseBracedGroup(true);
    }

    if (char === "\\") {
      return this.parseCommand();
    }

    if (char === "(" || char === "[") {
      return this.parseDelimitedGroup(char);
    }

    this.index += 1;

    if (/\s/.test(char)) return "<mspace width=\"0.35em\" />";
    if (/[0-9.]/.test(char)) return `<mn>${escapeHtml(char)}</mn>`;
    if (/[A-Za-z]/.test(char)) return `<mi>${escapeHtml(char)}</mi>`;
    return this.operator(char);
  }

  private parseCommand(): string {
    this.index += 1;
    const start = this.index;

    while (/[A-Za-z]/.test(this.input[this.index] ?? "")) {
      this.index += 1;
    }

    const command = this.input.slice(start, this.index);
    if (!command) {
      const escaped = this.input[this.index] ?? "";
      this.index += escaped ? 1 : 0;
      return this.operator(escaped);
    }

    if (command === "frac") {
      return `<mfrac>${this.parseRequiredArgument()}${this.parseRequiredArgument()}</mfrac>`;
    }

    if (command === "sqrt") {
      return `<msqrt>${this.parseRequiredArgument()}</msqrt>`;
    }

    if (command === "hat") {
      return `<mover>${this.parseRequiredArgument()}<mo>^</mo></mover>`;
    }

    if (command === "quad") {
      return "<mspace width=\"1em\" />";
    }

    if (command === "left" || command === "right") {
      return this.parseAtom();
    }

    const greek = greekCommands.get(command);
    if (greek) return `<mi>${greek}</mi>`;

    const operator = operatorCommands.get(command);
    if (operator) {
      return /^[A-Za-z]+$/.test(operator) ? `<mi>${operator}</mi>` : this.operator(operator);
    }

    return `<mi>${escapeHtml(command)}</mi>`;
  }

  private parseDelimitedGroup(opener: string): string {
    const closer = opener === "(" ? ")" : "]";
    this.index += 1;
    const group = this.parseExpression(closer);
    if (this.input[this.index] === closer) this.index += 1;
    return this.row([this.operator(opener), group, this.operator(closer)]);
  }

  private parseRequiredArgument(): string {
    while (/\s/.test(this.input[this.index] ?? "")) {
      this.index += 1;
    }

    if (this.input[this.index] === "{") {
      return this.parseBracedGroup(false);
    }

    return this.parseAtom();
  }

  private parseBracedGroup(renderEmptyBraces: boolean): string {
    this.index += 1;
    const group = this.parseExpression("}");
    if (this.input[this.index] === "}") this.index += 1;
    if (!group && renderEmptyBraces) return this.row([this.operator("{"), this.operator("}")]);
    return group;
  }

  private parseScripts(base: string): string {
    let subscript = "";
    let superscript = "";

    while (this.input[this.index] === "_" || this.input[this.index] === "^") {
      const scriptType = this.input[this.index];
      this.index += 1;
      const script = this.parseRequiredArgument();
      if (scriptType === "_") {
        subscript = script;
      } else {
        superscript = script;
      }
    }

    if (subscript && superscript) return `<msubsup>${base}${subscript}${superscript}</msubsup>`;
    if (subscript) return `<msub>${base}${subscript}</msub>`;
    if (superscript) return `<msup>${base}${superscript}</msup>`;
    return base;
  }

  private row(nodes: string[]) {
    if (nodes.length === 0) return "";
    if (nodes.length === 1) return nodes[0];
    return `<mrow>${nodes.join("")}</mrow>`;
  }

  private operator(value: string) {
    return `<mo>${escapeHtml(value)}</mo>`;
  }
}

export function latexToMathML(value: string, display = false) {
  const parser = new LatexParser(value);
  const body = parser.parse();
  const displayAttribute = display ? ' display="block"' : "";
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttribute}>${body}</math>`;
}

export function renderNodeNameHtml(value: string) {
  const segments = splitLatexSegments(value);
  return segments
    .map((segment) =>
      segment.kind === "math"
        ? `<span class="node-name-math">${latexToMathML(segment.value, segment.display)}</span>`
        : `<span>${escapeHtml(segment.value).replace(/\\\$/g, "$")}</span>`
    )
    .join("");
}
