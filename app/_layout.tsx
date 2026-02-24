import "../global.css";
import { Stack, Slot } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

export default function Layout() {
    return (
        <AuthProvider>
            <Slot />
        </AuthProvider>
    );
}
