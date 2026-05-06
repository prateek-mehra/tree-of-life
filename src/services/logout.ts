import { useAuthStore } from "../store/authStore";
import { useTreeStore } from "../store/treeStore";
import { signOut } from "./firebase";

export async function signOutWithAutoExport() {
  await useTreeStore.getState().exportChangedSessionTrees();
  await signOut();
  useAuthStore.getState().clearUser();
}
