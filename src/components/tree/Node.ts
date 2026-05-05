import * as d3 from "d3";
import type { HierarchyPointNode, Selection } from "d3";
import type { TreeNode } from "../../types/tree";
import { renderNodeNameHtml } from "../../utils/latex";

const LEAF_COLOR = "#2f7d32";
const BRANCH_COLOR = "#7a4a24";

export type D3TreeNode = HierarchyPointNode<TreeNode> & {
  id: string;
  x0?: number;
  y0?: number;
};

function hasVisibleChildren(node: D3TreeNode) {
  return Boolean(node.data.children?.length);
}

function isBranchNode(node: D3TreeNode, collapsedNodeIds: Set<string>) {
  return hasVisibleChildren(node) || collapsedNodeIds.has(node.data.id);
}

function getNodeColor(node: D3TreeNode, collapsedNodeIds: Set<string>) {
  return isBranchNode(node, collapsedNodeIds) ? BRANCH_COLOR : LEAF_COLOR;
}

export function appendNodeVisuals(
  nodeEnter: Selection<SVGGElement, D3TreeNode, SVGGElement, unknown>,
  collapsedNodeIds: Set<string>
) {
  nodeEnter
    .append("circle")
    .attr("r", 2.5)
    .attr("fill", (d) => getNodeColor(d, collapsedNodeIds))
    .attr("stroke-width", 10);

  nodeEnter
    .append("foreignObject")
    .attr("class", "node-label")
    .attr("width", 220)
    .attr("height", 54)
    .append("xhtml:div")
    .attr("class", "node-label-content")
    .html((d) => renderNodeNameHtml(d.data.name));
}

export function updateNodeVisuals(
  node: Selection<SVGGElement, D3TreeNode, SVGGElement, unknown>,
  collapsedNodeIds: Set<string>
) {
  node.select("circle").attr("fill", (d) => getNodeColor(d, collapsedNodeIds));

  node
    .select<SVGForeignObjectElement>("foreignObject.node-label")
    .attr("x", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? -226 : 6))
    .attr("y", -27)
    .select<HTMLDivElement>("div.node-label-content")
    .classed("is-left-aligned", (d) => !(d.data.children?.length || collapsedNodeIds.has(d.data.id)))
    .classed("is-right-aligned", (d) => Boolean(d.data.children?.length || collapsedNodeIds.has(d.data.id)))
    .style("color", (d) => getNodeColor(d, collapsedNodeIds))
    .html((d) => renderNodeNameHtml(d.data.name));
}

export const diagonal = d3
  .linkHorizontal<unknown, { x: number; y: number }>()
  .x((d) => d.y)
  .y((d) => d.x);
