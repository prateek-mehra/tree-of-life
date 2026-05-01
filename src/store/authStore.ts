import { create } from "zustand";
import type { AuthMode, AuthUser } from "../types/auth";

type AuthState = {
  mode: AuthMode;
  user: AuthUser | null;
  isAuthReady: boolean;
  setGuest(): void;
  setAuthenticated(user: AuthUser): void;
  clearUser(): void;
  setAuthReady(value: boolean): void;
};

export const useAuthStore = create<AuthState>((set) => ({
  mode: "guest",
  user: null,
  isAuthReady: false,
  setGuest: () => set({ mode: "guest", user: null }),
  setAuthenticated: (user) => set({ mode: "authenticated", user }),
  clearUser: () => set({ mode: "guest", user: null }),
  setAuthReady: (value) => set({ isAuthReady: value }),
}));
