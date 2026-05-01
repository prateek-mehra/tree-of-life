import { create } from "zustand";
import type { AuthMode } from "../types/auth";
import type { NodeActionPosition, TreeDocument, TreeNode } from "../types/tree";
import { FirestoreTreeRepository } from "../services/firestoreTreeRepository";
import { GuestTreeRepository } from "../services/guestTreeRepository";
import type { TreeRepository } from "../services/treeRepository";
import { addChildNode, cloneTreeNode, deleteLeafNode, findNode, updateNodeName as renameNode } from "../utils/treeTraversal";

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

function firstNodeId(root: TreeNode, preferredId: string) {
  return findNode(root, preferredId)?.id ?? root.id;
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
    set({
      activeTree: state.activeTreeId === saved.id ? saved : state.activeTree,
      trees: updateTreeInList(state.trees, saved),
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
      const trees = await repository.listTrees();
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
      for (const tree of treesToImport) {
        const root = cloneTreeNode(tree.root);
        const importedTree = await repository.createTree({
          name: tree.name || tree.root.name,
          root,
          is_favorite: tree.is_favorite,
          ownerId: get().userId ?? undefined,
        });
        const rootNodeId = firstNodeId(root, tree.originalRootNodeId);
        const viewRootNodeId = firstNodeId(root, tree.currentViewRootNodeId);
        const collapsedNodeIds = tree.collapsedNodeIds.filter((id) => findNode(root, id));
        const savedTree = await repository.updateTree(importedTree.id, {
          collapsedNodeIds,
          originalRootNodeId: rootNodeId,
          currentViewRootNodeId: viewRootNodeId,
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
      const nextTree = tree ? { ...tree, currentViewRootNodeId: tree.originalRootNodeId } : null;
      set({
        activeTree: nextTree,
        activeTreeId: nextTree?.id ?? null,
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
