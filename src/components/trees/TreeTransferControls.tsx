import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTreeStore } from "../../store/treeStore";
import { createTreeExport, parseTreeExport } from "../../utils/treeTransfer";

export function TreeTransferControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trees = useTreeStore((state) => state.trees);
  const importTrees = useTreeStore((state) => state.importTrees);

  function handleExport() {
    setError(null);
    const exportFile = createTreeExport(trees);
    const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tree-of-life-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const contents = await file.text();
      const importedTrees = parseTreeExport(contents);
      await importTrees(importedTrees);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to import trees.");
    }
  }

  return (
    <div className="tree-transfer-wrap">
      <div className="tree-transfer">
        <button className="icon-text-button" onClick={() => fileInputRef.current?.click()} title="Import trees from JSON">
          <Upload size={16} />
          <span>Import</span>
        </button>
        <button className="icon-text-button" disabled={!trees.length} onClick={handleExport} title="Export all trees as JSON">
          <Download size={16} />
          <span>Export</span>
        </button>
      </div>
      {error ? <div className="transfer-error">{error}</div> : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImport(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
