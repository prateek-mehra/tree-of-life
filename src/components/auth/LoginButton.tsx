import { LogOut } from "lucide-react";
import { signOut } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";

export function LoginButton() {
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const initial = (user?.displayName?.trim()[0] ?? "G").toUpperCase();

  async function handleSignOut() {
    await signOut();
    clearUser();
  }

  return (
    <div className="account-control" title={user?.displayName ?? "Guest"}>
      <span className="account-avatar" aria-hidden="true">
        {initial}
      </span>
      <button className="icon-button account-logout" onClick={() => void handleSignOut()} title="Log out">
        <LogOut size={16} />
      </button>
    </div>
  );
}
