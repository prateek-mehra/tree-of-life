import type { CreateTreeInput, TreeDocument } from "../types/tree";
import { createId } from "../utils/ids";
import { cloneTreeNode, createRootNode } from "../utils/treeTraversal";

export interface TreeRepository {
  listTrees(): Promise<TreeDocument[]>;
  getTree(id: string): Promise<TreeDocument | null>;
  createTree(input: CreateTreeInput): Promise<TreeDocument>;
  updateTree(id: string, patch: Partial<TreeDocument>): Promise<TreeDocument>;
  deleteTree(id: string): Promise<void>;
}

export function createTreeDocument(input: CreateTreeInput): TreeDocument {
  const now = new Date().toISOString();
  const name = input.name.trim() || "Untitled Tree";
  const root = input.root ? cloneTreeNode(input.root) : createRootNode(name);

  return {
    id: createId("tree"),
    name,
    created_at: now,
    updated_at: now,
    is_favorite: input.is_favorite ?? false,
    view_count: input.view_count ?? 0,
    root,
    collapsedNodeIds: [],
    originalRootNodeId: root.id,
    currentViewRootNodeId: root.id,
    ownerId: input.ownerId,
  };
}
