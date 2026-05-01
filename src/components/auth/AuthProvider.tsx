import { onAuthStateChanged } from "firebase/auth";
import { type PropsWithChildren, useEffect } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";
import { useTreeStore } from "../../store/treeStore";

export function AuthProvider({ children }: PropsWithChildren) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const configurePersistence = useTreeStore((state) => state.configurePersistence);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      clearUser();
      setAuthReady(true);
      void configurePersistence("guest", null);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) return;

    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        setAuthenticated(user);
        void configurePersistence("authenticated", user.uid);
      } else {
        clearUser();
        void configurePersistence("guest", null);
      }
      setAuthReady(true);
    });
  }, [clearUser, configurePersistence, setAuthenticated, setAuthReady]);

  return children;
}
