import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { AppFooter } from "./AppFooter";
import { signOut } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function AppShell({ children }: PropsWithChildren) {
  const clearUser = useAuthStore((state) => state.clearUser);
  const resetViewRoot = useTreeStore((state) => state.resetViewRoot);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText) return;

      if (event.key === "Escape") {
        event.preventDefault();
        void signOut().finally(clearUser);
        return;
      }

      if (event.metaKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        resetViewRoot();
        window.location.hash = "";
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearUser, resetViewRoot]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workspace">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
