import { CreateTreeDialog } from "../trees/CreateTreeDialog";
import { TreeList } from "../trees/TreeList";
import { TreeTransferControls } from "../trees/TreeTransferControls";

type SidebarProps = {
  isOpen: boolean;
};

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside className="sidebar" aria-hidden={!isOpen}>
      <CreateTreeDialog />
      <TreeTransferControls />
      <TreeList />
    </aside>
  );
}
