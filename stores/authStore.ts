import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { registerForPushNotificationsAsync } from "../utils/notifications";
import { db } from "../utils/firebase";
import {
  configureAuthStore,
  useAuthStore,
  initializeAuthListener,
  signOut,
  type UserProfile,
} from "../src/runtime/authStore";

configureAuthStore({
  enhanceProfile: async ({ user }) => {
    const updates: Record<string, unknown> = {
      lastActivePlatform: Platform.OS,
    };

    try {
      if (Platform.OS !== "web") {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          updates.pushToken = pushToken;
        }
      }

      if (Object.keys(updates).length > 0) {
        await setDoc(doc(db, "users", user.uid), updates, { merge: true });
      }
    } catch (error) {
      console.warn("Failed to update push/platform info:", error);
    }

    return updates as Partial<UserProfile>;
  },
});

export { useAuthStore, initializeAuthListener, signOut };
export type { UserProfile };
