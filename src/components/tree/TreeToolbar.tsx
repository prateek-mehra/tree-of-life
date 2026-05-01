import { RotateCcw } from "lucide-react";
import { useTreeStore } from "../../store/treeStore";

export function TreeToolbar() {
  const tree = useTreeStore((state) => state.activeTree);
  const resetViewRoot = useTreeStore((state) => state.resetViewRoot);

  if (!tree || tree.currentViewRootNodeId === tree.originalRootNodeId) return null;

  return (
    <div className="tree-toolbar">
      <button className="icon-text-button" onClick={resetViewRoot}>
        <RotateCcw size={16} />
        <span>Back to Tree of Life</span>
      </button>
    </div>
  );
}
