import type { CreateTreeInput, TreeDocument } from "../types/tree";
import { createTreeDocument, type TreeRepository } from "./treeRepository";

type DriveFileList = {
  files?: Array<{ id: string }>;
};

type DriveFileCreate = {
  id?: string;
};

type StoredTreePayload = {
  trees?: TreeDocument[];
};

const DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const SYNC_FILE_NAME = "tree-of-life-trees.json";

export class DriveTreeRepository implements TreeRepository {
  private fileId: string | null = null;

  constructor(
    private readonly userId: string,
    private readonly getAccessToken: () => Promise<string | null>
  ) {}

  async listTrees() {
    const trees = await this.readTrees();
    return trees.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async getTree(id: string) {
    const trees = await this.readTrees();
    return trees.find((tree) => tree.id === id) ?? null;
  }

  async createTree(input: CreateTreeInput) {
    const trees = await this.readTrees();
    const tree = createTreeDocument({ ...input, ownerId: this.userId });
    await this.writeTrees([tree, ...trees]);
    return tree;
  }

  async updateTree(id: string, patch: Partial<TreeDocument>) {
    const trees = await this.readTrees();
    const current = trees.find((tree) => tree.id === id);
    if (!current) throw new Error("Tree not found");

    const next = {
      ...current,
      ...patch,
      id,
      ownerId: this.userId,
      updated_at: new Date().toISOString(),
    };
    await this.writeTrees(trees.map((tree) => (tree.id === id ? next : tree)));
    return next;
  }

  async deleteTree(id: string) {
    const trees = await this.readTrees();
    await this.writeTrees(trees.filter((tree) => tree.id !== id));
  }

  private async readTrees() {
    const token = await this.requireAccessToken();
    const fileId = await this.findRemoteFileId(token);
    if (!fileId) return [];

    const payload = await this.driveFetch<StoredTreePayload>(`${DRIVE_FILES_API}/${fileId}?alt=media`, { token });
    return Array.isArray(payload.trees) ? payload.trees : [];
  }

  private async writeTrees(trees: TreeDocument[]) {
    const token = await this.requireAccessToken();
    const existingId = await this.findRemoteFileId(token);
    const payload: StoredTreePayload = { trees };

    if (existingId) {
      await this.driveFetch(`${DRIVE_UPLOAD_API}/${existingId}?uploadType=media`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      return;
    }

    const boundary = `tree_of_life_${Math.random().toString(16).slice(2)}`;
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: ["appDataFolder"],
      mimeType: "application/json",
    };
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(payload),
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const created = await this.driveFetch<DriveFileCreate>(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id`, {
      method: "POST",
      token,
      body,
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    });
    this.fileId = created.id ?? null;
  }

  private async findRemoteFileId(token: string) {
    if (this.fileId) return this.fileId;

    const query = encodeURIComponent(`name='${SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
    const data = await this.driveFetch<DriveFileList>(
      `${DRIVE_FILES_API}?spaces=appDataFolder&fields=files(id)&pageSize=1&q=${query}`,
      { token }
    );
    this.fileId = data.files?.[0]?.id ?? null;
    return this.fileId;
  }

  private async requireAccessToken() {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Google Drive authorization was not granted.");
    return token;
  }

  private async driveFetch<T = unknown>(
    url: string,
    {
      method = "GET",
      token,
      body,
      headers,
    }: {
      method?: string;
      token: string;
      body?: BodyInit;
      headers?: Record<string, string>;
    }
  ) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(headers ?? {}),
      },
      body,
    });

    if (response.status === 204) return null as T;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Google Drive request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}
