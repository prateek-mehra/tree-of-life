import { useAuthStore } from "../store/authStore";
import { useTreeStore } from "../store/treeStore";
import { signOutOfGoogle } from "./googleIdentity";

export async function signOutWithAutoExport() {
  const userId = useAuthStore.getState().user?.uid;
  await useTreeStore.getState().exportChangedSessionTrees();
  signOutOfGoogle(userId);
  useAuthStore.getState().clearUser();
  await useTreeStore.getState().configurePersistence("guest", null);
}
