import { FormEvent, useEffect, useState } from "react";
import { findNode } from "../../utils/treeTraversal";
import { useTreeStore } from "../../store/treeStore";

export function EditNodeDialog() {
  const editingNodeId = useTreeStore((state) => state.editingNodeId);
  const activeTree = useTreeStore((state) => state.activeTree);
  const stopEditingNode = useTreeStore((state) => state.stopEditingNode);
  const updateNodeName = useTreeStore((state) => state.updateNodeName);
  const [name, setName] = useState("");

  const node = editingNodeId && activeTree ? findNode(activeTree.root, editingNodeId) : null;

  useEffect(() => {
    setName(node?.name ?? "");
  }, [node?.name]);

  if (!editingNodeId || !node) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void updateNodeName(editingNodeId, name);
    stopEditingNode();
  };

  return (
    <div className="dialog-scrim" onClick={stopEditingNode}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <label htmlFor="node-name">Node name</label>
        <input id="node-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={stopEditingNode}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
