import { openDB, type DBSchema } from "idb";
import type { CreateTreeInput, TreeDocument } from "../types/tree";
import { createTreeDocument, type TreeRepository } from "./treeRepository";

type TreeDB = DBSchema & {
  trees: {
    key: string;
    value: TreeDocument;
  };
};

const dbPromise = openDB<TreeDB>("tree-of-life", 1, {
  upgrade(db) {
    db.createObjectStore("trees", { keyPath: "id" });
  },
});

export class GuestTreeRepository implements TreeRepository {
  async listTrees() {
    const db = await dbPromise;
    const trees = await db.getAll("trees");
    return trees.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async getTree(id: string) {
    const db = await dbPromise;
    return (await db.get("trees", id)) ?? null;
  }

  async createTree(input: CreateTreeInput) {
    const db = await dbPromise;
    const tree = createTreeDocument(input);
    await db.put("trees", tree);
    return tree;
  }

  async updateTree(id: string, patch: Partial<TreeDocument>) {
    const db = await dbPromise;
    const current = await this.getTree(id);
    if (!current) throw new Error("Tree not found");
    const next = { ...current, ...patch, id, updated_at: new Date().toISOString() };
    await db.put("trees", next);
    return next;
  }

  async deleteTree(id: string) {
    const db = await dbPromise;
    await db.delete("trees", id);
  }
}
