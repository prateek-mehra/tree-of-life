import { describe, expect, it } from "vitest";
import {
  addChildNode,
  cloneTreeNode,
  cloneTreeNodeWithFreshIds,
  cloneVisibleSubtree,
  deleteLeafNode,
  findNode,
  replaceNode,
  updateNodeName,
} from "./treeTraversal";
import type { TreeNode } from "../types/tree";
import { getTopLevelTrees } from "./treeTransfer";
import type { TreeDocument } from "../types/tree";

const tree: TreeNode = {
  id: "life",
  name: "Life",
  children: [
    {
      id: "body",
      name: "Body",
      children: [{ id: "sleep", name: "Sleep", children: [] }],
    },
  ],
};

describe("treeTraversal", () => {
  it("finds nested nodes", () => {
    expect(findNode(tree, "sleep")?.name).toBe("Sleep");
  });

  it("renames a node immutably", () => {
    const next = updateNodeName(tree, "body", "Health");
    expect(findNode(next, "body")?.name).toBe("Health");
    expect(findNode(tree, "body")?.name).toBe("Body");
  });

  it("adds child nodes", () => {
    const next = addChildNode(tree, "body", "Nutrition");
    expect(findNode(next, "body")?.children).toHaveLength(2);
  });

  it("deletes leaf nodes immutably", () => {
    const next = deleteLeafNode(tree, "sleep");
    expect(findNode(next, "sleep")).toBeNull();
    expect(findNode(tree, "sleep")?.name).toBe("Sleep");
  });

  it("removes children from collapsed visible clones", () => {
    const next = cloneVisibleSubtree(tree, new Set(["body"]));
    expect(findNode(next, "body")?.children).toBeUndefined();
  });

  it("clones a full subtree immutably", () => {
    const body = findNode(tree, "body");
    expect(body).not.toBeNull();

    const next = cloneTreeNode(body!);
    expect(next).toEqual(body);
    expect(next).not.toBe(body);
    expect(next.children?.[0]).not.toBe(body?.children?.[0]);
  });

  it("clones a tree with fresh node ids and an old-to-new id map", () => {
    const next = cloneTreeNodeWithFreshIds(tree);

    expect(next.root.name).toBe("Life");
    expect(next.root.id).not.toBe("life");
    expect(next.idMap.get("life")).toBe(next.root.id);
    expect(next.idMap.get("body")).toBe(next.root.children?.[0].id);
    expect(next.idMap.get("sleep")).toBe(next.root.children?.[0].children?.[0].id);
  });

  it("reuses a fresh id map across linked tree clones", () => {
    const idMap = new Map<string, string>();
    const life = cloneTreeNodeWithFreshIds(tree, idMap);
    const body = cloneTreeNodeWithFreshIds(tree.children![0], idMap);

    expect(body.root.id).toBe(life.root.children?.[0].id);
    expect(body.root.children?.[0].id).toBe(life.root.children?.[0].children?.[0].id);
  });

  it("replaces a subtree by node id", () => {
    const next = replaceNode(tree, "body", {
      id: "body",
      name: "Health",
      children: [{ id: "nutrition", name: "Nutrition", children: [] }],
    });

    expect(findNode(next, "body")?.name).toBe("Health");
    expect(findNode(next, "sleep")).toBeNull();
    expect(findNode(next, "nutrition")?.name).toBe("Nutrition");
    expect(findNode(tree, "sleep")?.name).toBe("Sleep");
  });
});

describe("treeTransfer", () => {
  function treeDocument(id: string, root: TreeNode, updatedAt = "2026-01-01T00:00:00.000Z"): TreeDocument {
    return {
      id,
      name: root.name,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: updatedAt,
      is_favorite: false,
      view_count: 0,
      root,
      collapsedNodeIds: [],
      originalRootNodeId: root.id,
      currentViewRootNodeId: root.id,
    };
  }

  it("exports only trees that are not subtrees of another tree", () => {
    const life = treeDocument("life-tree", tree);
    const body = treeDocument("body-tree", tree.children![0]);
    const standalone = treeDocument("career-tree", { id: "career", name: "Career", children: [] });

    expect(getTopLevelTrees([body, standalone, life]).map((item) => item.id)).toEqual(["career-tree", "life-tree"]);
  });

  it("keeps the newest document when duplicate tree roots exist", () => {
    const older = treeDocument("older-life", tree, "2026-01-01T00:00:00.000Z");
    const newer = treeDocument("newer-life", tree, "2026-01-02T00:00:00.000Z");

    expect(getTopLevelTrees([older, newer])).toEqual([newer]);
  });
});
