import { createId } from "./ids";
import type { TreeNode } from "../types/tree";

export function createRootNode(): TreeNode {
  return {
    id: createId("node"),
    name: "Life",
    children: [],
  };
}

export function ensureNodeIds(node: TreeNode): TreeNode {
  return {
    ...node,
    id: node.id || createId("node"),
    children: node.children?.map(ensureNodeIds),
  };
}

export function findNode(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return root;

  for (const child of root.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }

  return null;
}

export function cloneTreeNode(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children?.map(cloneTreeNode),
  };
}

export function updateNodeName(root: TreeNode, nodeId: string, name: string): TreeNode {
  if (root.id === nodeId) {
    return { ...root, name };
  }

  return {
    ...root,
    children: root.children?.map((child) => updateNodeName(child, nodeId, name)),
  };
}

export function addChildNode(root: TreeNode, parentId: string, name = "New branch"): TreeNode {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...(root.children ?? []), { id: createId("node"), name, children: [] }],
    };
  }

  return {
    ...root,
    children: root.children?.map((child) => addChildNode(child, parentId, name)),
  };
}

export function deleteLeafNode(root: TreeNode, nodeId: string): TreeNode {
  return {
    ...root,
    children: root.children
      ?.filter((child) => child.id !== nodeId)
      .map((child) => deleteLeafNode(child, nodeId)),
  };
}

export function cloneVisibleSubtree(node: TreeNode, collapsedIds: Set<string>): TreeNode {
  if (collapsedIds.has(node.id)) {
    return { ...node, children: undefined };
  }

  return {
    ...node,
    children: node.children?.map((child) => cloneVisibleSubtree(child, collapsedIds)),
  };
}

export function countNodes(node: TreeNode): number {
  return 1 + (node.children ?? []).reduce((total, child) => total + countNodes(child), 0);
}

export function hasChildren(node: TreeNode) {
  return Boolean(node.children?.length);
}
