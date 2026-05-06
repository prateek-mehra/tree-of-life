import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { FaqPage } from "./components/help/FaqPage";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import { ContextMenu } from "./components/tree/ContextMenu";
import { AddChildDialog } from "./components/tree/AddChildDialog";
import { EditNodeDialog } from "./components/tree/EditNodeDialog";
import { useTreeStore } from "./store/treeStore";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./components/auth/LoginPage";

export function App() {
  const [route, setRoute] = useState(() => window.location.hash);
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

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!isAuthReady) {
    return <div className="app-loading">Preparing Tree of Life...</div>;
  }

  if (!hasEnteredApp) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <main className="canvas-region">
        {route === "#faq" ? (
          <FaqPage />
        ) : activeTree ? (
          <>
            {error ? <div className="status-banner">{error}</div> : null}
            {isLoading ? (
              <div className="empty-state">Loading your trees...</div>
            ) : (
              <TreeCanvas key={activeTree.id} tree={activeTree} />
            )}
          </>
        ) : (
          <>
            {error ? <div className="status-banner">{error}</div> : null}
            {isLoading ? (
              <div className="empty-state">Loading your trees...</div>
            ) : (
              <div className="empty-state">Create a tree to begin.</div>
            )}
          </>
        )}
      </main>
      <ContextMenu />
      <AddChildDialog />
      <EditNodeDialog />
    </AppShell>
  );
}
