import type { AuthUser } from "../types/auth";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
};

type GoogleTokenClient = {
  requestAccessToken(options?: { prompt?: string }): void;
};

type GoogleAccounts = {
  id?: {
    disableAutoSelect(): void;
    initialize(options: { client_id: string; callback(response: GoogleCredentialResponse): void }): void;
    renderButton(element: HTMLElement, options: Record<string, string | number>): void;
  };
  oauth2?: {
    initTokenClient(options: {
      client_id: string;
      scope: string;
      callback(response: GoogleTokenResponse): void;
    }): GoogleTokenClient;
    revoke(token: string, callback: () => void): void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const USER_STORAGE_KEY = "tree_of_life_google_user_v1";
const TOKEN_STORAGE_PREFIX = "tree_of_life_drive_token_v1";

let scriptPromise: Promise<void> | null = null;
let tokenClient: GoogleTokenClient | null = null;
let tokenClientUserId: string | null = null;
let tokenRequest:
  | {
      promise: Promise<string | null>;
      resolve(token: string | null): void;
      reject(error: Error): void;
    }
  | null = null;

export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID);

function getTokenStorageKey(userId: string) {
  return `${TOKEN_STORAGE_PREFIX}:${userId}`;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Google sign-in did not return a valid profile.");

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const json = decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
  return JSON.parse(json) as {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };
}

function userFromCredential(credential: string): AuthUser {
  const profile = decodeJwtPayload(credential);
  if (!profile.sub || !profile.email) throw new Error("Google sign-in did not return an account profile.");

  return {
    uid: profile.sub,
    displayName: profile.name ?? profile.email,
    email: profile.email,
    photoURL: profile.picture ?? null,
  };
}

export function getStoredGoogleUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeGoogleUser(user: AuthUser) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredGoogleUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function loadGoogleClient() {
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error("Set VITE_GOOGLE_CLIENT_ID to enable Google login."));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function renderGoogleButton(element: HTMLElement, onSignIn: (user: AuthUser) => void) {
  await loadGoogleClient();
  const googleId = window.google?.accounts?.id;
  if (!GOOGLE_CLIENT_ID || !googleId) throw new Error("Google sign-in is unavailable.");

  googleId.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (!response.credential) return;
      const user = userFromCredential(response.credential);
      onSignIn(user);
    },
  });

  element.innerHTML = "";
  googleId.renderButton(element, {
    theme: "outline",
    size: "large",
    text: "continue_with",
    width: 260,
  });
}

export async function getDriveAccessToken(userId: string, options: { interactive?: boolean } = {}) {
  const existing = readStoredToken(userId);
  if (existing) return existing;

  await loadGoogleClient();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!GOOGLE_CLIENT_ID || !oauth2) throw new Error("Google Drive authorization is unavailable.");

  if (!tokenClient || tokenClientUserId !== userId) {
    tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (!tokenRequest) return;

        if (response.error) {
          tokenRequest.reject(new Error(response.error));
          tokenRequest = null;
          return;
        }

        const token = response.access_token ?? null;
        if (token) {
          localStorage.setItem(
            getTokenStorageKey(userId),
            JSON.stringify({
              accessToken: token,
              tokenExpiry: Date.now() + (response.expires_in ?? 0) * 1000,
            })
          );
        }

        tokenRequest.resolve(token);
        tokenRequest = null;
      },
    });
    tokenClientUserId = userId;
  }

  if (tokenRequest) return tokenRequest.promise;

  let resolve: (token: string | null) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<string | null>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  tokenRequest = { promise, resolve, reject };
  tokenClient.requestAccessToken({ prompt: options.interactive ? "consent" : "" });
  return promise;
}

function readStoredToken(userId: string) {
  try {
    const stored = localStorage.getItem(getTokenStorageKey(userId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { accessToken?: string; tokenExpiry?: number };
    if (parsed.accessToken && parsed.tokenExpiry && Date.now() < parsed.tokenExpiry - 60_000) {
      return parsed.accessToken;
    }
    localStorage.removeItem(getTokenStorageKey(userId));
    return null;
  } catch {
    return null;
  }
}

export function signOutOfGoogle(userId?: string) {
  clearStoredGoogleUser();
  if (userId) {
    const token = readStoredToken(userId);
    localStorage.removeItem(getTokenStorageKey(userId));
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
  }
  window.google?.accounts?.id?.disableAutoSelect();
}
