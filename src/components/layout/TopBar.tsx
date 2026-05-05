import { CircleDotDashed } from "lucide-react";
import { LoginButton } from "../auth/LoginButton";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

type TopBarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  const mode = useAuthStore((state) => state.mode);
  const isSaving = useTreeStore((state) => state.isSaving);

  return (
    <header className="topbar">
      <div className="brand">
        <button
          className="icon-button brand-toggle"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide tree panel" : "Show tree panel"}
        >
          <CircleDotDashed size={18} />
        </button>
        <span>Tree of Life</span>
      </div>
      <div className="topbar-actions">
        <span className="save-state">{isSaving ? "Saving..." : mode === "authenticated" ? "Synced" : ""}</span>
        <LoginButton />
      </div>
    </header>
  );
}
