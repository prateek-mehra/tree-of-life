import { CreateTreeDialog } from "../trees/CreateTreeDialog";
import { TreeList } from "../trees/TreeList";
import { TreeTransferControls } from "../trees/TreeTransferControls";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <CreateTreeDialog />
      <TreeTransferControls />
      <TreeList />
    </aside>
  );
}
