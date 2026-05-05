import { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import { ContextMenu } from "./components/tree/ContextMenu";
import { AddChildDialog } from "./components/tree/AddChildDialog";
import { EditNodeDialog } from "./components/tree/EditNodeDialog";
import { TreeToolbar } from "./components/tree/TreeToolbar";
import { useTreeStore } from "./store/treeStore";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./components/auth/LoginPage";

export function App() {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const hasEnteredApp = useAuthStore((state) => state.hasEnteredApp);
  const activeTree = useTreeStore((state) => state.activeTree);
  const loadTrees = useTreeStore((state) => state.loadTrees);
  const isLoading = useTreeStore((state) => state.isLoading);
  const error = useTreeStore((state) => state.error);

  useEffect(() => {
    if (!hasEnteredApp) return;
    void loadTrees();
  }, [hasEnteredApp, loadTrees]);

  if (!isAuthReady) {
    return <div className="app-loading">Preparing Tree of Life...</div>;
  }

  if (!hasEnteredApp) {
    return <LoginPage />;
  }

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
