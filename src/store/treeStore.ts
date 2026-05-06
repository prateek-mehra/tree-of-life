import { create } from "zustand";
import type { AuthMode } from "../types/auth";
import type { NodeActionPosition, TreeDocument, TreeNode } from "../types/tree";
import { FirestoreTreeRepository } from "../services/firestoreTreeRepository";
import { GuestTreeRepository } from "../services/guestTreeRepository";
import type { TreeRepository } from "../services/treeRepository";
import {
  addChildNode,
  cloneTreeNode,
  cloneTreeNodeWithFreshIds,
  deleteLeafNode,
  findNode,
  replaceNode,
  updateNodeName as renameNode,
} from "../utils/treeTraversal";

const guestRepository = new GuestTreeRepository();
let repository: TreeRepository = guestRepository;

type TreeState = {
  trees: TreeDocument[];
  activeTreeId: string | null;
  activeTree: TreeDocument | null;
  mode: AuthMode;
  userId: string | null;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  addingChildToNodeId: string | null;
  contextMenu: NodeActionPosition | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  configurePersistence(mode: AuthMode, userId: string | null): Promise<void>;
  loadTrees(): Promise<void>;
  createTree(name: string): Promise<void>;
  importTrees(trees: TreeDocument[]): Promise<void>;
  selectTree(id: string): Promise<void>;
  updateNodeName(nodeId: string, name: string): Promise<void>;
  addChildNode(parentId: string, name?: string): Promise<void>;
  deleteNode(nodeId: string): Promise<void>;
  deleteTree(treeId: string): Promise<void>;
  toggleNodeCollapsed(nodeId: string): Promise<void>;
  setFavorite(treeId: string, value: boolean): Promise<void>;
  saveNodeAsFavoriteTree(nodeId: string): Promise<void>;
  viewNodeAsRoot(nodeId: string): void;
  resetViewRoot(): void;
  openContextMenu(position: NodeActionPosition): void;
  closeContextMenu(): void;
  startEditingNode(nodeId: string): void;
  stopEditingNode(): void;
  startAddingChildNode(nodeId: string): void;
  stopAddingChildNode(): void;
};

function updateTreeInList(trees: TreeDocument[], nextTree: TreeDocument) {
  const next = trees.map((tree) => (tree.id === nextTree.id ? nextTree : tree));
  return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function updateTreesInList(trees: TreeDocument[], nextTrees: TreeDocument[]) {
  const replacements = new Map(nextTrees.map((tree) => [tree.id, tree]));
  const next = trees.map((tree) => replacements.get(tree.id) ?? tree);
  return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function firstNodeId(root: TreeNode, preferredId: string) {
  return findNode(root, preferredId)?.id ?? root.id;
}

function openAtOriginalRoot(tree: TreeDocument) {
  return { ...tree, currentViewRootNodeId: firstNodeId(tree.root, tree.originalRootNodeId) };
}

async function repairStoredViewRoot(tree: TreeDocument) {
  const nextTree = openAtOriginalRoot(tree);
  if (nextTree.currentViewRootNodeId === tree.currentViewRootNodeId) {
    return nextTree;
  }

  return repository.updateTree(tree.id, {
    currentViewRootNodeId: nextTree.currentViewRootNodeId,
  });
}

function validCollapsedNodeIds(root: TreeNode, collapsedNodeIds: string[]) {
  return collapsedNodeIds.filter((id) => findNode(root, id));
}

async function syncLinkedTreeContent(saved: TreeDocument, trees: TreeDocument[]) {
  const syncedTrees: TreeDocument[] = [saved];

  for (const tree of trees) {
    if (tree.id === saved.id) continue;

    if (findNode(tree.root, saved.root.id)) {
      const root = replaceNode(tree.root, saved.root.id, saved.root);
      syncedTrees.push(
        await repository.updateTree(tree.id, {
          root,
          collapsedNodeIds: validCollapsedNodeIds(root, tree.collapsedNodeIds),
          currentViewRootNodeId: firstNodeId(root, tree.currentViewRootNodeId),
        })
      );
      continue;
    }

    const linkedSubtree = findNode(saved.root, tree.root.id);
    if (linkedSubtree) {
      const root = cloneTreeNode(linkedSubtree);
      syncedTrees.push(
        await repository.updateTree(tree.id, {
          name: root.name,
          root,
          collapsedNodeIds: validCollapsedNodeIds(root, tree.collapsedNodeIds),
          originalRootNodeId: root.id,
          currentViewRootNodeId: root.id,
        })
      );
    }
  }

  return syncedTrees;
}

async function reconcileStoredLinkedContent(trees: TreeDocument[]) {
  let nextTrees = trees;
  const newestToOldest = [...trees].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  for (const tree of newestToOldest) {
    const currentTree = nextTrees.find((item) => item.id === tree.id);
    if (!currentTree) continue;
    const syncedTrees = await syncLinkedTreeContent(currentTree, nextTrees);
    nextTrees = updateTreesInList(nextTrees, syncedTrees);
  }

  return nextTrees;
}

async function persistActiveTree(
  tree: TreeDocument,
  patch: Partial<TreeDocument>,
  set: (state: Partial<TreeState>) => void,
  get: () => TreeState
) {
  set({ isSaving: true, error: null });
  try {
    const saved = await repository.updateTree(tree.id, patch);
    const state = get();
    const syncedTrees = patch.root ? await syncLinkedTreeContent(saved, state.trees) : [saved];
    const nextTrees = updateTreesInList(state.trees, syncedTrees);
    const nextActiveTree =
      syncedTrees.find((item) => item.id === state.activeTreeId) ?? (state.activeTreeId === saved.id ? saved : state.activeTree);

    set({
      activeTree: nextActiveTree,
      trees: nextTrees,
      isSaving: false,
    });
  } catch (error) {
    set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to save tree." });
  }
}

export const useTreeStore = create<TreeState>((set, get) => ({
  trees: [],
  activeTreeId: null,
  activeTree: null,
  mode: "guest",
  userId: null,
  selectedNodeId: null,
  editingNodeId: null,
  addingChildToNodeId: null,
  contextMenu: null,
  isLoading: false,
  isSaving: false,
  error: null,

  async configurePersistence(mode, userId) {
    repository = mode === "authenticated" && userId ? new FirestoreTreeRepository(userId) : guestRepository;
    set({ mode, userId, activeTree: null, activeTreeId: null, trees: [] });
    await get().loadTrees();
  },

  async loadTrees() {
    set({ isLoading: true, error: null });
    try {
      const repairedTrees = await Promise.all((await repository.listTrees()).map(repairStoredViewRoot));
      const trees = await reconcileStoredLinkedContent(repairedTrees);
      const activeTree = trees[0] ?? null;
      set({
        trees,
        activeTree,
        activeTreeId: activeTree?.id ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Unable to load trees." });
    }
  },

  async createTree(name) {
    set({ isSaving: true, error: null });
    try {
      const tree = await repository.createTree({ name, ownerId: get().userId ?? undefined });
      set({
        trees: [tree, ...get().trees],
        activeTree: tree,
        activeTreeId: tree.id,
        isSaving: false,
      });
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to create tree." });
    }
  },

  async importTrees(treesToImport) {
    if (!treesToImport.length) {
      set({ error: "Import file does not contain any trees." });
      return;
    }

    set({ isSaving: true, error: null });
    try {
      const importedTrees: TreeDocument[] = [];
      const idMap = new Map<string, string>();
      for (const tree of treesToImport) {
        const { root } = cloneTreeNodeWithFreshIds(tree.root, idMap);
        const importedTree = await repository.createTree({
          name: tree.name || tree.root.name,
          root,
          is_favorite: tree.is_favorite,
          view_count: tree.view_count ?? 0,
          ownerId: get().userId ?? undefined,
        });
        const rootNodeId = idMap.get(tree.originalRootNodeId) ?? root.id;
        const collapsedNodeIds = tree.collapsedNodeIds
          .map((id) => idMap.get(id))
          .filter((id): id is string => Boolean(id));
        const savedTree = await repository.updateTree(importedTree.id, {
          collapsedNodeIds,
          originalRootNodeId: rootNodeId,
          currentViewRootNodeId: rootNodeId,
        });
        importedTrees.push(savedTree);
      }

      const allTrees = [...importedTrees, ...get().trees].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      set({
        trees: allTrees,
        activeTree: importedTrees[0] ?? get().activeTree,
        activeTreeId: importedTrees[0]?.id ?? get().activeTreeId,
        isSaving: false,
      });
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to import trees." });
    }
  },

  async selectTree(id) {
    set({ isLoading: true, error: null });
    try {
      const tree = await repository.getTree(id);
      const repairedTree = tree ? await repairStoredViewRoot(tree) : null;
      const nextTree = repairedTree
        ? await repository.updateTree(repairedTree.id, { view_count: (repairedTree.view_count ?? 0) + 1 })
        : null;
      const nextTrees = nextTree ? updateTreeInList(get().trees, nextTree) : get().trees;
      set({
        activeTree: nextTree,
        activeTreeId: nextTree?.id ?? null,
        trees: nextTrees,
        isLoading: false,
        contextMenu: null,
        editingNodeId: null,
        addingChildToNodeId: null,
      });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Unable to open tree." });
    }
  },

  async updateNodeName(nodeId, name) {
    const tree = get().activeTree;
    const cleanName = name.trim();
    if (!tree || !cleanName) return;
    const root = renameNode(tree.root, nodeId, cleanName);
    await persistActiveTree(tree, { root }, set, get);
  },

  async addChildNode(parentId, name = "New branch") {
    const tree = get().activeTree;
    const cleanName = name.trim();
    if (!tree || !cleanName) return;
    const root = addChildNode(tree.root, parentId, cleanName);
    const collapsedNodeIds = tree.collapsedNodeIds.filter((id) => id !== parentId);
    await persistActiveTree(tree, { root, collapsedNodeIds }, set, get);
  },

  async deleteNode(nodeId) {
    const tree = get().activeTree;
    if (!tree) return;

    const node = findNode(tree.root, nodeId);
    if (!node) return;
    if (node.id === tree.root.id) {
      set({ error: "The root node cannot be deleted." });
      return;
    }
    if (node.children?.length) {
      set({ error: "Only leaf nodes can be deleted." });
      return;
    }

    const root = deleteLeafNode(tree.root, nodeId);
    const collapsedNodeIds = tree.collapsedNodeIds.filter((id) => id !== nodeId);
    await persistActiveTree(tree, { root, collapsedNodeIds }, set, get);
  },

  async deleteTree(treeId) {
    const tree = get().trees.find((item) => item.id === treeId);
    if (!tree) return;

    set({ isSaving: true, error: null });
    try {
      await repository.deleteTree(treeId);
      const remainingTrees = get().trees.filter((item) => item.id !== treeId);
      const nextActiveTree = get().activeTreeId === treeId ? (remainingTrees[0] ?? null) : get().activeTree;
      set({
        trees: remainingTrees,
        activeTree: nextActiveTree,
        activeTreeId: nextActiveTree?.id ?? null,
        isSaving: false,
        contextMenu: null,
        editingNodeId: null,
        addingChildToNodeId: null,
      });
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to delete tree." });
    }
  },

  async toggleNodeCollapsed(nodeId) {
    const tree = get().activeTree;
    if (!tree) return;
    const node = findNode(tree.root, nodeId);
    if (!node?.children?.length) return;
    const isCollapsed = tree.collapsedNodeIds.includes(nodeId);
    const collapsedNodeIds = isCollapsed
      ? tree.collapsedNodeIds.filter((id) => id !== nodeId)
      : [...tree.collapsedNodeIds, nodeId];
    await persistActiveTree(tree, { collapsedNodeIds }, set, get);
  },

  async setFavorite(treeId, value) {
    const tree = get().trees.find((item) => item.id === treeId);
    if (!tree) return;
    await persistActiveTree(tree, { is_favorite: value }, set, get);
  },

  async saveNodeAsFavoriteTree(nodeId) {
    const tree = get().activeTree;
    if (!tree) return;

    const node = findNode(tree.root, nodeId);
    if (!node) return;

    const existingTree = get().trees.find((item) => item.originalRootNodeId === nodeId);
    if (existingTree) {
      if (!existingTree.is_favorite) {
        await persistActiveTree(existingTree, { is_favorite: true }, set, get);
      }
      await get().selectTree(existingTree.id);
      return;
    }

    set({ isSaving: true, error: null });
    try {
      const favoriteTree = await repository.createTree({
        name: node.name,
        root: cloneTreeNode(node),
        is_favorite: true,
        ownerId: get().userId ?? undefined,
      });
      set({
        trees: [favoriteTree, ...get().trees],
        activeTree: favoriteTree,
        activeTreeId: favoriteTree.id,
        isSaving: false,
        contextMenu: null,
      });
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to save favorite tree." });
    }
  },

  viewNodeAsRoot(nodeId) {
    const tree = get().activeTree;
    if (!tree || !findNode(tree.root, nodeId)) return;
    const nextTree = { ...tree, currentViewRootNodeId: nodeId };
    set({
      activeTree: nextTree,
      trees: updateTreeInList(get().trees, nextTree),
      contextMenu: null,
    });
    void persistActiveTree(tree, { currentViewRootNodeId: nodeId }, set, get);
  },

  resetViewRoot() {
    const tree = get().activeTree;
    if (!tree) return;
    const nextTree = { ...tree, currentViewRootNodeId: tree.originalRootNodeId };
    set({ activeTree: nextTree, trees: updateTreeInList(get().trees, nextTree) });
    void persistActiveTree(tree, { currentViewRootNodeId: tree.originalRootNodeId }, set, get);
  },

  openContextMenu(position) {
    set({ contextMenu: position, selectedNodeId: position.nodeId });
  },

  closeContextMenu() {
    set({ contextMenu: null });
  },

  startEditingNode(nodeId) {
    set({ editingNodeId: nodeId, contextMenu: null });
  },

  stopEditingNode() {
    set({ editingNodeId: null });
  },

  startAddingChildNode(nodeId) {
    set({ addingChildToNodeId: nodeId, contextMenu: null });
  },

  stopAddingChildNode() {
    set({ addingChildToNodeId: null });
  },
}));
