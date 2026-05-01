import { describe, expect, it } from "vitest";
import { addChildNode, cloneTreeNode, cloneVisibleSubtree, deleteLeafNode, findNode, updateNodeName } from "./treeTraversal";
import type { TreeNode } from "../types/tree";

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
});
