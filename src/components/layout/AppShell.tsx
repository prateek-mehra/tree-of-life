import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AppFooter } from "./AppFooter";

export function AppShell({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText) return;
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsSidebarOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`app-shell ${isSidebarOpen ? "" : "sidebar-is-closed"}`}>
      <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((value) => !value)} />
      <div className="workspace">
        <Sidebar isOpen={isSidebarOpen} />
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
