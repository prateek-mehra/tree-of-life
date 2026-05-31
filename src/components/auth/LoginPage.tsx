import { CircleDotDashed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getDriveAccessToken, isGoogleConfigured, renderGoogleButton, storeGoogleUser } from "../../services/googleIdentity";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function LoginPage() {
  const startGuestSession = useAuthStore((state) => state.startGuestSession);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const configurePersistence = useTreeStore((state) => state.configurePersistence);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [guestName, setGuestName] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const cleanGuestName = guestName.trim();

  useEffect(() => {
    if (!isGoogleConfigured || !googleButtonRef.current) return;

    let isMounted = true;
    void renderGoogleButton(googleButtonRef.current, (user) => {
      if (!isMounted) return;
      setIsWorking(true);
      setLoginError(null);
      void getDriveAccessToken(user.uid, { interactive: true })
        .then((token) => {
          if (!token) throw new Error("Google Drive authorization was not granted.");
          storeGoogleUser(user);
          setAuthenticated(user);
          return configurePersistence("authenticated", user.uid);
        })
        .catch((error) => {
          setLoginError(error instanceof Error ? error.message : "Unable to sync with Google Drive.");
        })
        .finally(() => setIsWorking(false));
    }).catch((error) => {
      if (!isMounted) return;
      setLoginError(error instanceof Error ? error.message : "Unable to load Google sign-in.");
    });

    return () => {
      isMounted = false;
    };
  }, [configurePersistence, setAuthenticated]);

  async function enterAsGuest() {
    if (!cleanGuestName) return;
    setIsWorking(true);
    setLoginError(null);
    startGuestSession(cleanGuestName);
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
          <span>Start privately as a guest, or sync with Google.</span>
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
          <div className="google-button-frame" aria-busy={isWorking}>
            <div ref={googleButtonRef} />
            {!isGoogleConfigured ? <span>Set VITE_GOOGLE_CLIENT_ID to enable Google login.</span> : null}
          </div>
          {loginError ? <p className="login-error">{loginError}</p> : null}
        </div>
      </section>
    </main>
  );
}
