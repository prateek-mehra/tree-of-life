import { openDB, type DBSchema } from "idb";
import type { TreeDocument } from "../types/tree";
import { createTreeExport, getTopLevelTrees } from "./treeTransfer";

type ExportDirectoryDB = DBSchema & {
  settings: {
    key: "directory";
    value: FileSystemDirectoryHandle;
  };
};

declare global {
  interface FileSystemDirectoryHandle {
    queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  }

  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const dbPromise = openDB<ExportDirectoryDB>("tree-of-life-auto-export", 1, {
  upgrade(db) {
    db.createObjectStore("settings");
  },
});

async function getStoredDirectoryHandle() {
  const db = await dbPromise;
  return (await db.get("settings", "directory")) ?? null;
}

async function storeDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const db = await dbPromise;
  await db.put("settings", handle, "directory");
}

async function ensureWritableDirectoryHandle() {
  let handle = await getStoredDirectoryHandle();

  if (handle && handle.queryPermission && (await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    const permission = handle.requestPermission ? await handle.requestPermission({ mode: "readwrite" }) : "denied";
    if (permission !== "granted") {
      handle = null;
    }
  }

  if (!handle) {
    if (!window.showDirectoryPicker) return null;
    try {
      handle = await window.showDirectoryPicker({
        id: "tree-of-life-auto-export",
        mode: "readwrite",
        startIn: "documents",
      });
    } catch {
      return null;
    }
    await storeDirectoryHandle(handle);
  }

  return handle;
}

function sanitizePathPart(value: string) {
  return (value.trim() || "Untitled Tree")
    .split("")
    .map((character) => (character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? "-" : character))
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function timestampForFileName(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function downloadTree(tree: TreeDocument, timestamp: string) {
  const exportFile = createTreeExport([tree]);
  const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tree-of-life_${sanitizePathPart(tree.root.name)}_${timestamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function writeTreeFile(baseHandle: FileSystemDirectoryHandle, tree: TreeDocument, timestamp: string) {
  const treeOfLifeHandle =
    baseHandle.name === "tree-of-life"
      ? baseHandle
      : await baseHandle.getDirectoryHandle("tree-of-life", { create: true });
  const treeHandle = await treeOfLifeHandle.getDirectoryHandle(sanitizePathPart(tree.root.name), { create: true });
  const fileHandle = await treeHandle.getFileHandle(`${timestamp}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(createTreeExport([tree]), null, 2));
  await writable.close();
}

export async function autoExportChangedSessionTrees(trees: TreeDocument[]) {
  const topLevelTrees = getTopLevelTrees(trees);
  if (!topLevelTrees.length) return;

  const timestamp = timestampForFileName();
  const directoryHandle = await ensureWritableDirectoryHandle();

  if (directoryHandle) {
    try {
      await Promise.all(topLevelTrees.map((tree) => writeTreeFile(directoryHandle, tree, timestamp)));
      return;
    } catch {
      topLevelTrees.forEach((tree) => downloadTree(tree, timestamp));
      return;
    }
  }

  topLevelTrees.forEach((tree) => downloadTree(tree, timestamp));
}
