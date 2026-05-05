import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useTreeStore } from "../../store/treeStore";
import { FavoriteToggle } from "./FavoriteToggle";

export function TreeList() {
  const trees = useTreeStore((state) => state.trees);
  const activeTreeId = useTreeStore((state) => state.activeTreeId);
  const selectTree = useTreeStore((state) => state.selectTree);
  const setFavorite = useTreeStore((state) => state.setFavorite);
  const deleteTree = useTreeStore((state) => state.deleteTree);

  const favorites = useMemo(() => trees.filter((tree) => tree.is_favorite), [trees]);

  function handleDeleteTree(treeId: string, treeName: string) {
    if (!window.confirm(`Delete "${treeName}"?`)) return;
    void deleteTree(treeId);
  }

  if (!trees.length) {
    return <div className="sidebar-empty">No trees yet.</div>;
  }

  return (
    <div className="tree-list-wrap">
      <section>
        <h2>Favorites</h2>
        {favorites.length ? (
          <div className="tree-list">
            {favorites.map((tree) => (
              <div
                className={`tree-row ${tree.id === activeTreeId ? "is-active" : ""}`}
                key={tree.id}
              >
                <button className="tree-row-main" onClick={() => void selectTree(tree.id)}>
                  <span>{tree.root.name}</span>
                </button>
                <div className="tree-row-actions">
                  <FavoriteToggle active={tree.is_favorite} onToggle={() => void setFavorite(tree.id, !tree.is_favorite)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Mark a tree as favorite to pin it here.</p>
        )}
      </section>

      <section>
        <h2>All Trees</h2>
        <div className="tree-list">
          {trees.map((tree) => (
            <div
              className={`tree-row ${tree.id === activeTreeId ? "is-active" : ""}`}
              key={tree.id}
            >
              <button className="tree-row-main" onClick={() => void selectTree(tree.id)}>
                <span>{tree.root.name}</span>
              </button>
              <div className="tree-row-actions">
                <FavoriteToggle active={tree.is_favorite} onToggle={() => void setFavorite(tree.id, !tree.is_favorite)} />
                <button
                  className="tree-delete-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteTree(tree.id, tree.root.name);
                  }}
                  title="Delete tree"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
