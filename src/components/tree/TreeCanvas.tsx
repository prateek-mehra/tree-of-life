import * as d3 from "d3";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HierarchyPointLink } from "d3";
import type { TreeDocument } from "../../types/tree";
import { cloneVisibleSubtree, countNodes, findNode } from "../../utils/treeTraversal";
import { bindLongPress } from "../../utils/longPress";
import { useTreeStore } from "../../store/treeStore";
import { appendNodeVisuals, diagonal, type D3TreeNode, updateNodeVisuals } from "./Node";

type TreeCanvasProps = {
  tree: TreeDocument;
};

type StoredPosition = {
  x: number;
  y: number;
};

export function TreeCanvas({ tree }: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(new Map<string, StoredPosition>());
  const lastSourceRef = useRef<string>(tree.currentViewRootNodeId);
  const [width, setWidth] = useState(928);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const toggleNodeCollapsed = useTreeStore((state) => state.toggleNodeCollapsed);
  const openContextMenu = useTreeStore((state) => state.openContextMenu);
  const startAddingChildNode = useTreeStore((state) => state.startAddingChildNode);
  const viewNodeAsRoot = useTreeStore((state) => state.viewNodeAsRoot);
  const deleteNode = useTreeStore((state) => state.deleteNode);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(360, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewRoot = useMemo(() => {
    const root = findNode(tree.root, tree.currentViewRootNodeId) ?? tree.root;
    return cloneVisibleSubtree(root, new Set(tree.collapsedNodeIds));
  }, [tree.collapsedNodeIds, tree.currentViewRootNodeId, tree.root]);

  useEffect(() => {
    if (!hoveredNodeId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText) return;

      if (event.key === " ") {
        event.preventDefault();
        startAddingChildNode(hoveredNodeId);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !event.metaKey) {
        event.preventDefault();
        void deleteNode(hoveredNodeId);
        setHoveredNodeId(null);
        return;
      }

      if (event.key === "Meta" && !event.repeat) {
        viewNodeAsRoot(hoveredNodeId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteNode, hoveredNodeId, startAddingChildNode, viewNodeAsRoot]);

  useLayoutEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;
    const dx = 10;
    const fullRoot = d3.hierarchy(tree.root);
    const dy = (width - marginRight - marginLeft) / Math.max(1, 1 + fullRoot.height);
    const layout = d3.tree<typeof viewRoot>().nodeSize([dx, dy]);
    const root = d3.hierarchy(viewRoot) as D3TreeNode;
    const sourceId = lastSourceRef.current;
    const sourcePosition = positionsRef.current.get(sourceId) ?? { x: 0, y: 0 };
    const nodeCount = countNodes(viewRoot);
    const duration = nodeCount > 500 ? 0 : nodeCount > 250 ? 120 : 250;

    root.x0 = sourcePosition.x;
    root.y0 = sourcePosition.y;
    layout(root);

    let left = root;
    let right = root;
    root.eachBefore((node) => {
      const d3Node = node as D3TreeNode;
      d3Node.id = d3Node.data.id;
      const previous = positionsRef.current.get(d3Node.data.id);
      d3Node.x0 = previous?.x ?? sourcePosition.x;
      d3Node.y0 = previous?.y ?? sourcePosition.y;
      if (d3Node.x < left.x) left = d3Node;
      if (d3Node.x > right.x) right = d3Node;
    });

    const height = Math.max(220, right.x - left.x + marginTop + marginBottom);
    const svg = d3.select(svgElement);
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-marginLeft} ${left.x - marginTop} ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;");

    let gLink = svg.select<SVGGElement>("g.tree-links");
    if (gLink.empty()) {
      gLink = svg
        .append("g")
        .attr("class", "tree-links")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);
    }

    let gNode = svg.select<SVGGElement>("g.tree-nodes");
    if (gNode.empty()) {
      gNode = svg.append("g").attr("class", "tree-nodes").attr("cursor", "pointer").attr("pointer-events", "all");
    }

    svg.transition().duration(duration);
    const collapsedIds = new Set(tree.collapsedNodeIds);
    const nodes = root.descendants().reverse() as D3TreeNode[];
    const links = root.links() as HierarchyPointLink<typeof viewRoot>[];

    const node = gNode.selectAll<SVGGElement, D3TreeNode>("g").data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("transform", () => `translate(${sourcePosition.y},${sourcePosition.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event: MouseEvent, d) => {
        event.stopPropagation();
        lastSourceRef.current = d.data.id;
        void toggleNodeCollapsed(d.data.id);
      })
      .on("contextmenu", (event: MouseEvent, d) => {
        event.preventDefault();
        lastSourceRef.current = d.data.id;
        openContextMenu({ nodeId: d.data.id, x: event.clientX, y: event.clientY });
      });

    nodeEnter.each(function (_, index, groups) {
      const element = groups[index];
      bindLongPress(element, {
        onLongPress: (event) => {
          event.preventDefault();
          const datum = d3.select<SVGGElement, D3TreeNode>(element).datum();
          lastSourceRef.current = datum.data.id;
          openContextMenu({ nodeId: datum.data.id, x: event.clientX, y: event.clientY });
        },
      });
    });

    appendNodeVisuals(nodeEnter, collapsedIds);

    const nodeUpdate = node.merge(nodeEnter);
    updateNodeVisuals(nodeUpdate, collapsedIds);
    nodeUpdate.classed("is-hovered", (d) => d.data.id === hoveredNodeId);
    nodeUpdate.select<SVGTextElement>("text").on("mouseenter", (event: MouseEvent, d) => {
      lastSourceRef.current = d.data.id;
      setHoveredNodeId(d.data.id);
      if (event.metaKey) {
        viewNodeAsRoot(d.data.id);
      }
    });
    nodeUpdate.select<SVGTextElement>("text").on("mouseleave", (_event: MouseEvent, d) => {
      setHoveredNodeId((current) => (current === d.data.id ? null : current));
    });

    nodeUpdate
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    node
      .exit()
      .transition()
      .duration(duration)
      .remove()
      .attr("transform", () => `translate(${sourcePosition.y},${sourcePosition.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    const link = gLink
      .selectAll<SVGPathElement, HierarchyPointLink<typeof viewRoot>>("path")
      .data(links, (d) => d.target.data.id);

    link
      .enter()
      .append("path")
      .attr("d", () => diagonal({ source: sourcePosition, target: sourcePosition }))
      .merge(link)
      .transition()
      .duration(duration)
      .attr("d", (d) => diagonal(d));

    link
      .exit()
      .transition()
      .duration(duration)
      .remove()
      .attr("d", () => diagonal({ source: sourcePosition, target: sourcePosition }));

    root.eachBefore((node) => {
      positionsRef.current.set(node.data.id, { x: node.x, y: node.y });
    });
  }, [
    hoveredNodeId,
    openContextMenu,
    toggleNodeCollapsed,
    tree.collapsedNodeIds,
    tree.currentViewRootNodeId,
    tree.root,
    viewNodeAsRoot,
    viewRoot,
    width,
  ]);

  return (
    <div className="tree-canvas" ref={wrapperRef}>
      <svg aria-label={`${tree.name} visualization`} ref={svgRef} role="img" />
    </div>
  );
}
