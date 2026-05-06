import type { TreeDocument, TreeNode } from "../types/tree";

export type TreeExportFile = {
  app: "tree-of-life";
  version: 1;
  exportedAt: string;
  trees: TreeDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTreeNode(value: unknown): value is TreeNode {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return false;
  if (value.children === undefined) return true;
  return Array.isArray(value.children) && value.children.every(isTreeNode);
}

function isTreeDocument(value: unknown): value is TreeDocument {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.created_at) &&
    isString(value.updated_at) &&
    typeof value.is_favorite === "boolean" &&
    isTreeNode(value.root) &&
    Array.isArray(value.collapsedNodeIds) &&
    value.collapsedNodeIds.every(isString) &&
    isString(value.originalRootNodeId) &&
    isString(value.currentViewRootNodeId) &&
    (value.ownerId === undefined || isString(value.ownerId))
  );
}

export function createTreeExport(trees: TreeDocument[]): TreeExportFile {
  return {
    app: "tree-of-life",
    version: 1,
    exportedAt: new Date().toISOString(),
    trees,
  };
}

export function getTopLevelTrees(trees: TreeDocument[]) {
  const latestByRootId = new Map<string, TreeDocument>();

  for (const tree of trees) {
    const existing = latestByRootId.get(tree.root.id);
    if (!existing || tree.updated_at.localeCompare(existing.updated_at) > 0) {
      latestByRootId.set(tree.root.id, tree);
    }
  }

  const uniqueTrees = Array.from(latestByRootId.values());

  return uniqueTrees.filter(
    (tree) => !uniqueTrees.some((otherTree) => otherTree.id !== tree.id && containsNode(otherTree.root, tree.root.id, true))
  );
}

export function parseTreeExport(contents: string): TreeDocument[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Import file is not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.app !== "tree-of-life" || parsed.version !== 1 || !Array.isArray(parsed.trees)) {
    throw new Error("Import file is not a Tree of Life export.");
  }

  if (!parsed.trees.every(isTreeDocument)) {
    throw new Error("Import file contains an unsupported tree format.");
  }

  return parsed.trees;
}

function containsNode(root: TreeNode, nodeId: string, skipRoot = false): boolean {
  if (!skipRoot && root.id === nodeId) return true;
  return (root.children ?? []).some((child) => child.id === nodeId || containsNode(child, nodeId));
}
