import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { AppFooter } from "./AppFooter";
import { HeaderTreeControls } from "./HeaderTreeControls";
import { signOutWithAutoExport } from "../../services/logout";
import { useTreeStore } from "../../store/treeStore";

export function AppShell({ children }: PropsWithChildren) {
  const trees = useTreeStore((state) => state.trees);
  const selectTree = useTreeStore((state) => state.selectTree);
  const resetViewRoot = useTreeStore((state) => state.resetViewRoot);

  useEffect(() => {
    async function openLifeTree() {
      const lifeTree = trees.find((tree) => tree.root.name.trim().toLowerCase() === "life");
      if (!lifeTree) return;
      await selectTree(lifeTree.id);
      resetViewRoot();
      window.location.hash = "";
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText) return;

      if (event.key === "Escape") {
        event.preventDefault();
        void signOutWithAutoExport();
        return;
      }

      if (event.metaKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        window.location.hash = window.location.hash === "#faq" ? "" : "faq";
        return;
      }

      if (event.metaKey && (event.key === "<" || (event.shiftKey && event.key === ","))) {
        event.preventDefault();
        resetViewRoot();
        window.location.hash = "";
        return;
      }

      if (event.metaKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        void openLifeTree();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetViewRoot, selectTree, trees]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workspace">
        {children}
      </div>
      <div className="side-tree-controls">
        <HeaderTreeControls />
      </div>
      <AppFooter />
    </div>
  );
}
