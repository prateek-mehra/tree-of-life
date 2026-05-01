import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTreeStore } from "../../store/treeStore";

export function CreateTreeDialog() {
  const [name, setName] = useState("");
  const createTree = useTreeStore((state) => state.createTree);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void createTree(name || "Tree of Life");
    setName("");
  };

  return (
    <form className="create-tree" onSubmit={submit}>
      <input
        aria-label="Tree name"
        placeholder="New tree"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button className="icon-button" type="submit" title="Create tree">
        <Plus size={18} />
      </button>
    </form>
  );
}
