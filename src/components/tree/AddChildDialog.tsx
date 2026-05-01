import { FormEvent, useEffect, useState } from "react";
import { findNode } from "../../utils/treeTraversal";
import { useTreeStore } from "../../store/treeStore";

export function AddChildDialog() {
  const addingChildToNodeId = useTreeStore((state) => state.addingChildToNodeId);
  const activeTree = useTreeStore((state) => state.activeTree);
  const addChildNode = useTreeStore((state) => state.addChildNode);
  const stopAddingChildNode = useTreeStore((state) => state.stopAddingChildNode);
  const [name, setName] = useState("");

  const parent = addingChildToNodeId && activeTree ? findNode(activeTree.root, addingChildToNodeId) : null;

  useEffect(() => {
    setName("");
  }, [addingChildToNodeId]);

  if (!addingChildToNodeId || !parent) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void addChildNode(addingChildToNodeId, name);
    stopAddingChildNode();
  };

  return (
    <div className="dialog-scrim" onClick={stopAddingChildNode}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <label htmlFor="child-node-name">Child node name</label>
        <input id="child-node-name" autoFocus required value={name} onChange={(event) => setName(event.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={stopAddingChildNode}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Add child
          </button>
        </div>
      </form>
    </div>
  );
}
