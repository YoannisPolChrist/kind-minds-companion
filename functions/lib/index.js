"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
admin.initializeApp();
const db = admin.firestore();
const expo = new expo_server_sdk_1.Expo();
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)("notifications/{notificationId}", async (event) => {
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
        const lastActivePlatform = (userData === null || userData === void 0 ? void 0 : userData.lastActivePlatform) || "web";
        const pushToken = userData === null || userData === void 0 ? void 0 : userData.pushToken;
        const email = userData === null || userData === void 0 ? void 0 : userData.email;
        // Ensure the notification is marked as processed so we don't handle it again if we implement retries
        await snapshot.ref.update({ status: "processed", processedAt: admin.firestore.FieldValue.serverTimestamp() });
        // Condition 1: Use push notification if active platform is 'app' and token exists
        if (lastActivePlatform === "app" && pushToken && expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
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
                }
                catch (error) {
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
        }
        else {
            console.warn(`User ${userId} has no pushToken and no email. Cannot send notification.`);
        }
    }
    catch (error) {
        console.error("Error processing notification:", error);
    }
});
//# sourceMappingURL=index.js.map