import { Edit3, FolderTree, Plus, Star } from "lucide-react";
import { useTreeStore } from "../../store/treeStore";

export function ContextMenu() {
  const contextMenu = useTreeStore((state) => state.contextMenu);
  const activeTree = useTreeStore((state) => state.activeTree);
  const closeContextMenu = useTreeStore((state) => state.closeContextMenu);
  const startEditingNode = useTreeStore((state) => state.startEditingNode);
  const startAddingChildNode = useTreeStore((state) => state.startAddingChildNode);
  const saveNodeAsFavoriteTree = useTreeStore((state) => state.saveNodeAsFavoriteTree);
  const viewNodeAsRoot = useTreeStore((state) => state.viewNodeAsRoot);

  if (!contextMenu || !activeTree) return null;

  return (
    <div className="context-scrim" onClick={closeContextMenu}>
      <div
        className="context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={() => startEditingNode(contextMenu.nodeId)}>
          <Edit3 size={15} />
          <span>Edit node name</span>
        </button>
        <button
          onClick={() => {
            startAddingChildNode(contextMenu.nodeId);
          }}
        >
          <Plus size={15} />
          <span>Add child node</span>
        </button>
        <button
          onClick={() => {
            void saveNodeAsFavoriteTree(contextMenu.nodeId);
            closeContextMenu();
          }}
        >
          <Star size={15} />
          <span>Save as favorite tree</span>
        </button>
        <button onClick={() => viewNodeAsRoot(contextMenu.nodeId)}>
          <FolderTree size={15} />
          <span>View this node as root</span>
        </button>
      </div>
    </div>
  );
}
