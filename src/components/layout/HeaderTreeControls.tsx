import { Download, Heart, Plus, Trash2, Trees, Upload } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTreeStore } from "../../store/treeStore";
import { createTreeExport, parseTreeExport } from "../../utils/treeTransfer";
import { FavoriteToggle } from "../trees/FavoriteToggle";

type TreePopupMode = "favorites" | "all" | null;

function byViewsDesc<T extends { view_count?: number; updated_at: string }>(a: T, b: T) {
  return (b.view_count ?? 0) - (a.view_count ?? 0) || b.updated_at.localeCompare(a.updated_at);
}

export function HeaderTreeControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [popupMode, setPopupMode] = useState<TreePopupMode>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const trees = useTreeStore((state) => state.trees);
  const activeTreeId = useTreeStore((state) => state.activeTreeId);
  const createTree = useTreeStore((state) => state.createTree);
  const importTrees = useTreeStore((state) => state.importTrees);
  const selectTree = useTreeStore((state) => state.selectTree);
  const setFavorite = useTreeStore((state) => state.setFavorite);
  const deleteTree = useTreeStore((state) => state.deleteTree);

  const sortedTrees = useMemo(() => [...trees].sort(byViewsDesc), [trees]);
  const favoriteTrees = useMemo(() => sortedTrees.filter((tree) => tree.is_favorite), [sortedTrees]);
  const popupTrees = popupMode === "favorites" ? favoriteTrees : sortedTrees;

  function handleExport() {
    setTransferError(null);
    if (!trees.length) return;
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
    setTransferError(null);
    try {
      const contents = await file.text();
      const importedTrees = parseTreeExport(contents);
      await importTrees(importedTrees);
    } catch (caughtError) {
      setTransferError(caughtError instanceof Error ? caughtError.message : "Unable to import trees.");
    }
  }

  function submitNewTree(event: FormEvent) {
    event.preventDefault();
    const cleanName = newTreeName.trim();
    if (!cleanName) return;
    void createTree(cleanName);
    setNewTreeName("");
    setIsCreateOpen(false);
  }

  function handleDeleteTree(treeId: string, treeName: string) {
    if (!window.confirm(`Delete "${treeName}"?`)) return;
    void deleteTree(treeId);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText || event.ctrlKey || event.shiftKey) return;

      if (event.altKey && !event.metaKey && event.code === "KeyN") {
        event.preventDefault();
        setIsCreateOpen(true);
        return;
      }

      if (!event.metaKey || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case "f":
          event.preventDefault();
          setPopupMode((mode) => (mode === "favorites" ? null : "favorites"));
          break;
        case "a":
          event.preventDefault();
          setPopupMode((mode) => (mode === "all" ? null : "all"));
          break;
        case "e":
          event.preventDefault();
          handleExport();
          break;
        case "i":
          event.preventDefault();
          fileInputRef.current?.click();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trees]);

  return (
    <div className="header-tree-controls">
      <button
        className="icon-button topbar-icon"
        onClick={() => fileInputRef.current?.click()}
        title="Import trees"
        aria-label="Import trees"
      >
        <Upload size={17} />
      </button>
      <button
        className={`icon-button topbar-icon ${popupMode === "favorites" ? "is-active" : ""}`}
        onClick={() => setPopupMode((mode) => (mode === "favorites" ? null : "favorites"))}
        title="Favorite trees"
        aria-label="Favorite trees"
      >
        <Heart size={17} />
      </button>
      <button
        className={`icon-button topbar-icon ${popupMode === "all" ? "is-active" : ""}`}
        onClick={() => setPopupMode((mode) => (mode === "all" ? null : "all"))}
        title="All trees"
        aria-label="All trees"
      >
        <Trees size={17} />
      </button>
      <button
        className="icon-button topbar-icon"
        disabled={!trees.length}
        onClick={handleExport}
        title="Export trees"
        aria-label="Export trees"
      >
        <Download size={17} />
      </button>
      <button
        className="icon-button topbar-icon"
        onClick={() => setIsCreateOpen(true)}
        title="New tree"
        aria-label="New tree"
      >
        <Plus size={18} />
      </button>

      {popupMode ? (
        <div className="tree-popup" role="dialog" aria-label={popupMode === "favorites" ? "Favorite trees" : "All trees"}>
          {popupTrees.length ? (
            <div className="tree-list tree-popup-list">
              {popupTrees.map((tree) => (
                <div className={`tree-row ${tree.id === activeTreeId ? "is-active" : ""}`} key={tree.id}>
                  <button
                    className="tree-row-main"
                    onClick={() => {
                      setPopupMode(null);
                      void selectTree(tree.id);
                    }}
                  >
                    <span>{tree.root.name}</span>
                  </button>
                  <div className="tree-row-actions">
                    <FavoriteToggle active={tree.is_favorite} onToggle={() => void setFavorite(tree.id, !tree.is_favorite)} />
                    {popupMode === "all" ? (
                      <button
                        className="tree-delete-toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTree(tree.id, tree.root.name);
                        }}
                        title="Delete tree"
                        aria-label={`Delete ${tree.root.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tree-popup-empty">{popupMode === "favorites" ? "No favorites yet." : "No trees yet."}</div>
          )}
        </div>
      ) : null}

      {transferError ? <div className="transfer-error header-transfer-error">{transferError}</div> : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImport(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      {isCreateOpen ? (
        <div className="dialog-scrim" onClick={() => setIsCreateOpen(false)}>
          <form className="dialog" onClick={(event) => event.stopPropagation()} onSubmit={submitNewTree}>
            <label htmlFor="new-tree-name">Tree name</label>
            <input
              id="new-tree-name"
              autoFocus
              value={newTreeName}
              onChange={(event) => setNewTreeName(event.target.value)}
              placeholder="Name this tree"
            />
            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={!newTreeName.trim()}>
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
