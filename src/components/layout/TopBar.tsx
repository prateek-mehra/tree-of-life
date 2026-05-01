import { CircleDotDashed } from "lucide-react";
import { LoginButton } from "../auth/LoginButton";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function TopBar() {
  const mode = useAuthStore((state) => state.mode);
  const isSaving = useTreeStore((state) => state.isSaving);

  return (
    <header className="topbar">
      <div className="brand">
        <CircleDotDashed size={18} />
        <span>Tree of Life</span>
      </div>
      <div className="topbar-actions">
        <span className="save-state">{isSaving ? "Saving..." : mode === "guest" ? "Guest mode" : "Synced"}</span>
        <LoginButton />
      </div>
    </header>
  );
}
