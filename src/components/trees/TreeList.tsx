import { useMemo } from "react";
import { useTreeStore } from "../../store/treeStore";
import { FavoriteToggle } from "./FavoriteToggle";

export function TreeList() {
  const trees = useTreeStore((state) => state.trees);
  const activeTreeId = useTreeStore((state) => state.activeTreeId);
  const selectTree = useTreeStore((state) => state.selectTree);
  const setFavorite = useTreeStore((state) => state.setFavorite);

  const favorites = useMemo(() => trees.filter((tree) => tree.is_favorite), [trees]);

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
              <button
                className={`tree-row ${tree.id === activeTreeId ? "is-active" : ""}`}
                key={tree.id}
                onClick={() => void selectTree(tree.id)}
              >
                <span>{tree.root.name}</span>
                <FavoriteToggle active={tree.is_favorite} onToggle={() => void setFavorite(tree.id, !tree.is_favorite)} />
              </button>
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
            <button
              className={`tree-row ${tree.id === activeTreeId ? "is-active" : ""}`}
              key={tree.id}
              onClick={() => void selectTree(tree.id)}
            >
              <span>{tree.root.name}</span>
              <FavoriteToggle active={tree.is_favorite} onToggle={() => void setFavorite(tree.id, !tree.is_favorite)} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
