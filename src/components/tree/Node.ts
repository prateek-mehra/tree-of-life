import * as d3 from "d3";
import type { HierarchyPointNode, Selection } from "d3";
import type { TreeNode } from "../../types/tree";

export type D3TreeNode = HierarchyPointNode<TreeNode> & {
  id: string;
  x0?: number;
  y0?: number;
};

export function appendNodeVisuals(
  nodeEnter: Selection<SVGGElement, D3TreeNode, SVGGElement, unknown>,
  collapsedNodeIds: Set<string>
) {
  nodeEnter
    .append("circle")
    .attr("r", 2.5)
    .attr("fill", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? "#555" : "#999"))
    .attr("stroke-width", 10);

  nodeEnter
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? -6 : 6))
    .attr("text-anchor", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? "end" : "start"))
    .text((d) => d.data.name)
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .attr("stroke", "white")
    .attr("paint-order", "stroke");
}

export function updateNodeVisuals(
  node: Selection<SVGGElement, D3TreeNode, SVGGElement, unknown>,
  collapsedNodeIds: Set<string>
) {
  node
    .select("circle")
    .attr("fill", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? "#555" : "#999"));

  node
    .select("text")
    .attr("x", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? -6 : 6))
    .attr("text-anchor", (d) => (d.data.children?.length || collapsedNodeIds.has(d.data.id) ? "end" : "start"))
    .text((d) => d.data.name);
}

export const diagonal = d3
  .linkHorizontal<unknown, { x: number; y: number }>()
  .x((d) => d.y)
  .y((d) => d.x);
