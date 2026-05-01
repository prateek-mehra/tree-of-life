import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { isFirebaseConfigured, signInWithGoogle, signOut } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";

export function LoginButton() {
  const mode = useAuthStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function handleSignIn() {
    setError(null);
    setIsWorking(true);
    try {
      await signInWithGoogle();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start Google sign-in.");
    } finally {
      setIsWorking(false);
    }
  }

  if (mode === "authenticated") {
    return (
      <button className="icon-text-button" onClick={() => void signOut()} title="Sign out">
        <LogOut size={16} />
        <span>{user?.displayName ?? "Sign out"}</span>
      </button>
    );
  }

  return (
    <div className="login-control">
      <button
        className="icon-text-button"
        disabled={isWorking}
        onClick={() => void handleSignIn()}
        title={isFirebaseConfigured ? "Continue with Google" : "Add Firebase config to enable Google login"}
      >
        <LogIn size={16} />
        <span>{isWorking ? "Opening..." : "Google"}</span>
      </button>
      {error ? <span className="auth-error">{error}</span> : null}
    </div>
  );
}
