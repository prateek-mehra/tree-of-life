import { type PropsWithChildren, useEffect } from "react";
import { getStoredGoogleUser } from "../../services/googleIdentity";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function AuthProvider({ children }: PropsWithChildren) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const configurePersistence = useTreeStore((state) => state.configurePersistence);

  useEffect(() => {
    const user = getStoredGoogleUser();

    if (user) {
      setAuthenticated(user);
      void configurePersistence("authenticated", user.uid).finally(() => setAuthReady(true));
      return;
    }

    clearUser();
    void configurePersistence("guest", null).finally(() => setAuthReady(true));
  }, [clearUser, configurePersistence, setAuthenticated, setAuthReady]);

  return children;
}
