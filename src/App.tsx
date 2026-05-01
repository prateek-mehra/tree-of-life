import { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import { ContextMenu } from "./components/tree/ContextMenu";
import { AddChildDialog } from "./components/tree/AddChildDialog";
import { EditNodeDialog } from "./components/tree/EditNodeDialog";
import { TreeToolbar } from "./components/tree/TreeToolbar";
import { useTreeStore } from "./store/treeStore";

export function App() {
  const activeTree = useTreeStore((state) => state.activeTree);
  const loadTrees = useTreeStore((state) => state.loadTrees);
  const isLoading = useTreeStore((state) => state.isLoading);
  const error = useTreeStore((state) => state.error);

  useEffect(() => {
    void loadTrees();
  }, [loadTrees]);

  return (
    <AppShell>
      <main className="canvas-region">
        <TreeToolbar />
        {error ? <div className="status-banner">{error}</div> : null}
        {isLoading ? (
          <div className="empty-state">Loading your trees...</div>
        ) : activeTree ? (
          <TreeCanvas tree={activeTree} />
        ) : (
          <div className="empty-state">Create a tree to begin.</div>
        )}
      </main>
      <ContextMenu />
      <AddChildDialog />
      <EditNodeDialog />
    </AppShell>
  );
}
