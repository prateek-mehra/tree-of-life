import { CircleDotDashed, CircleHelp } from "lucide-react";
import { LoginButton } from "../auth/LoginButton";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";
import { HeaderTreeControls } from "./HeaderTreeControls";

export function TopBar() {
  const mode = useAuthStore((state) => state.mode);
  const isSaving = useTreeStore((state) => state.isSaving);

  function toggleHelp() {
    window.location.hash = window.location.hash === "#faq" ? "" : "faq";
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <CircleDotDashed size={18} />
        </span>
        <span>Tree of Life</span>
      </div>
      <HeaderTreeControls />
      <div className="topbar-actions">
        <span className="save-state">{isSaving ? "Saving..." : mode === "authenticated" ? "Synced" : ""}</span>
        <button className="icon-button help-button" onClick={toggleHelp} title="Help and shortcuts" aria-label="Help and shortcuts">
          <CircleHelp size={17} />
        </button>
        <LoginButton />
      </div>
    </header>
  );
}
