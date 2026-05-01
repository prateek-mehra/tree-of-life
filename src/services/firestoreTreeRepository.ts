import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import type { CreateTreeInput, TreeDocument } from "../types/tree";
import { getFirebaseDb } from "./firebase";
import { createTreeDocument, type TreeRepository } from "./treeRepository";

export class FirestoreTreeRepository implements TreeRepository {
  constructor(private readonly userId: string) {}

  private treeCollection() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firebase is not configured.");
    return collection(db, "users", this.userId, "trees");
  }

  private treeDoc(id: string) {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firebase is not configured.");
    return doc(db, "users", this.userId, "trees", id);
  }

  async listTrees() {
    const snapshot = await getDocs(query(this.treeCollection(), orderBy("updated_at", "desc")));
    return snapshot.docs.map((item) => item.data() as TreeDocument);
  }

  async getTree(id: string) {
    const snapshot = await getDoc(this.treeDoc(id));
    return snapshot.exists() ? (snapshot.data() as TreeDocument) : null;
  }

  async createTree(input: CreateTreeInput) {
    const tree = createTreeDocument({ ...input, ownerId: this.userId });
    await setDoc(this.treeDoc(tree.id), tree);
    return tree;
  }

  async updateTree(id: string, patch: Partial<TreeDocument>) {
    const current = await this.getTree(id);
    if (!current) throw new Error("Tree not found");
    const next = {
      ...current,
      ...patch,
      id,
      ownerId: this.userId,
      updated_at: new Date().toISOString(),
    };
    await setDoc(this.treeDoc(id), next);
    return next;
  }

  async deleteTree(id: string) {
    await deleteDoc(this.treeDoc(id));
  }
}
