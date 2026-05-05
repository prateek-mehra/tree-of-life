import { ArrowLeft } from "lucide-react";

const shortcuts = [
  ["Click a branch node", "Collapse or expand it."],
  ["Right-click a node", "Open node actions."],
  ["Long-press a node", "Open node actions on touch screens."],
  ["Option + hover node name", "Add a child node."],
  ["Ctrl + hover node name", "Edit the node name."],
  ["Delete or Backspace while hovering", "Delete a leaf node."],
  ["Ctrl + B", "Show or hide the tree panel."],
];

const latexExamples = [
  ["Inline math", "$x^2 + y_1$"],
  ["Display math", "$$\\frac{a}{b}$$"],
  ["Parentheses form", "\\(\\alpha + \\beta\\)"],
  ["Square-root", "$\\sqrt{x}$"],
  ["Fraction", "$\\frac{n}{2}$"],
  ["Greek letters", "$\\theta, \\lambda, \\Omega$"],
  ["Operators", "$\\le, \\ge, \\neq, \\to, \\infty$"],
];

export function FaqPage() {
  return (
    <section className="faq-page" aria-labelledby="faq-title">
      <div className="faq-header">
        <a className="icon-text-button faq-back" href="#" aria-label="Back to tree">
          <ArrowLeft size={16} />
          <span>Back to tree</span>
        </a>
        <div>
          <p>Help</p>
          <h1 id="faq-title">Tree of Life FAQ</h1>
        </div>
      </div>

      <div className="faq-section">
        <h2>Basic Flow</h2>
        <ul>
          <li>Create a tree from the left panel, then add branches from any node.</li>
          <li>Use the node menu for edit, add child, save as favorite tree, and delete actions.</li>
          <li>Leaf nodes and their names are green. Branch nodes, collapsed branch nodes, and connections are brown.</li>
          <li>Only leaf nodes can be deleted, so structure stays intact.</li>
        </ul>
      </div>

      <div className="faq-section">
        <h2>Shortcuts</h2>
        <dl className="shortcut-list">
          {shortcuts.map(([key, action]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="faq-section">
        <h2>LaTeX In Names</h2>
        <ul>
          <li>Wrap math in <code>$...$</code>, <code>$$...$$</code>, <code>\(...\)</code>, or <code>\[...\]</code>.</li>
          <li>Supported syntax includes superscripts, subscripts, fractions, square roots, Greek letters, and common operators.</li>
          <li>Plain text can sit beside math in the same node name.</li>
          <li>Escape a dollar sign as <code>\$</code> when you want a literal dollar sign.</li>
        </ul>
        <dl className="latex-list">
          {latexExamples.map(([label, example]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <code>{example}</code>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
