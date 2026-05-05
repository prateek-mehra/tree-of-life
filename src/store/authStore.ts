import { create } from "zustand";
import type { AuthMode, AuthUser } from "../types/auth";

type AuthState = {
  mode: AuthMode;
  user: AuthUser | null;
  isAuthReady: boolean;
  hasEnteredApp: boolean;
  setGuest(): void;
  startGuestSession(name: string): void;
  startMockGoogleSession(): void;
  setAuthenticated(user: AuthUser): void;
  clearUser(): void;
  setAuthReady(value: boolean): void;
};

export const useAuthStore = create<AuthState>((set) => ({
  mode: "guest",
  user: null,
  isAuthReady: false,
  hasEnteredApp: false,
  setGuest: () => set({ mode: "guest", user: null }),
  startGuestSession: (name) =>
    set({
      mode: "guest",
      user: {
        uid: "guest-user",
        displayName: name.trim() || "Guest",
        email: null,
        photoURL: null,
      },
      hasEnteredApp: true,
    }),
  startMockGoogleSession: () =>
    set({
      mode: "authenticated",
      user: {
        uid: "mock-google-user",
        displayName: "Prateek Mehra",
        email: "partumehra@gmail.com",
        photoURL: null,
      },
      hasEnteredApp: true,
    }),
  setAuthenticated: (user) => set({ mode: "authenticated", user, hasEnteredApp: true }),
  clearUser: () => set({ mode: "guest", user: null, hasEnteredApp: false }),
  setAuthReady: (value) => set({ isAuthReady: value }),
}));
