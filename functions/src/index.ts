import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Expo } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

export const onNotificationCreated = onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) {
            console.log("No data associated with the event");
            return;
        }

        const data = snapshot.data();
        const { userId, title, body } = data;

        if (!userId) {
            console.error("Missing userId in notification document");
            return;
        }

        try {
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) {
                console.error(`User document not found for userId: ${userId}`);
                return;
            }

            const userData = userDoc.data();
            const lastActivePlatform = userData?.lastActivePlatform || "web";
            const pushToken = userData?.pushToken;
            const email = userData?.email;

            // Ensure the notification is marked as processed so we don't handle it again if we implement retries
            await snapshot.ref.update({ status: "processed", processedAt: admin.firestore.FieldValue.serverTimestamp() });

            // Condition 1: Use push notification if active platform is 'app' and token exists
            if (lastActivePlatform === "app" && pushToken && Expo.isExpoPushToken(pushToken)) {
                console.log(`Sending push notification to user ${userId}`);
                const messages = [];
                messages.push({
                    to: pushToken,
                    sound: "default",
                    title: title || "Neue Benachrichtigung",
                    body: body || "Du hast eine neue Benachrichtigung in der App.",
                    data: { withSome: "data" },
                });

                const chunks = expo.chunkPushNotifications(messages);
                for (const chunk of chunks) {
                    try {
                        await expo.sendPushNotificationsAsync(chunk);
                    } catch (error) {
                        console.error("Error sending chunk of push notifications", error);
                    }
                }
            }
            // Condition 2: Use email if active platform is 'web' or missing push token
            else if (email) {
                console.log(`Sending email notification to user ${userId} (${email})`);
                // We write to the 'mail' collection, which triggers the Firebase "Trigger Email" extension
                await db.collection("mail").add({
                    to: email,
                    message: {
                        subject: title || "Neue Benachrichtigung von deiner Therapie-App",
                        html: `<p>Hallo,</p><p>${body || "Du hast eine neue Benachrichtigung."}</p>`,
                    },
                });
            } else {
                console.warn(`User ${userId} has no pushToken and no email. Cannot send notification.`);
            }

        } catch (error) {
            console.error("Error processing notification:", error);
        }
    }
);
