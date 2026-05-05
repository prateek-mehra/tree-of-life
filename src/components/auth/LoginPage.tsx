import { CircleDotDashed, LogIn } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function LoginPage() {
  const startGuestSession = useAuthStore((state) => state.startGuestSession);
  const startMockGoogleSession = useAuthStore((state) => state.startMockGoogleSession);
  const configurePersistence = useTreeStore((state) => state.configurePersistence);
  const [guestName, setGuestName] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const cleanGuestName = guestName.trim();

  async function enterAsGuest() {
    if (!cleanGuestName) return;
    setIsWorking(true);
    startGuestSession(cleanGuestName);
    await configurePersistence("guest", null);
    setIsWorking(false);
  }

  async function enterWithGoogleMock() {
    setIsWorking(true);
    startMockGoogleSession();
    await configurePersistence("guest", null);
    setIsWorking(false);
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-mark">
          <CircleDotDashed size={22} />
        </div>
        <div className="login-copy">
          <p>Tree of Life</p>
          <h1 id="login-title">Map what matters.</h1>
          <span>Start privately as a guest, or preview the Google flow.</span>
        </div>
        <div className="login-actions">
          <label className="guest-name-field">
            <span>Your name</span>
            <input
              autoComplete="name"
              autoFocus
              onChange={(event) => setGuestName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void enterAsGuest();
              }}
              placeholder="Enter your name"
              value={guestName}
            />
          </label>
          <button
            className="primary-button login-primary"
            disabled={isWorking || !cleanGuestName}
            onClick={() => void enterAsGuest()}
          >
            Continue as Guest
          </button>
          <button className="secondary-button login-secondary" disabled={isWorking} onClick={() => void enterWithGoogleMock()}>
            <LogIn size={16} />
            <span>Continue with Google</span>
          </button>
        </div>
      </section>
    </main>
  );
}
