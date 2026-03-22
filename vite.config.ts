import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8080 },
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/pages/Login.tsx") || id.includes("/src/pages/Register.tsx")) {
            return "auth-pages";
          }

          if (id.includes("/src/components/motion/")) {
            return "ui-motion";
          }

          if (id.includes("/src/components/charts/")) {
            return "therapist-builder-charts";
          }

          if (
            id.includes("/src/pages/therapist/ExerciseBuilder.tsx") ||
            id.includes("/src/components/therapist/BuilderChartPreview.tsx")
          ) {
            return "therapist-builder";
          }

          if (
            id.includes("/src/pages/therapist/ClientDetail.tsx") ||
            id.includes("/src/pages/therapist/ClientExercises.tsx") ||
            id.includes("/src/pages/therapist/ClientCheckins.tsx") ||
            id.includes("/src/pages/therapist/ClientNotes.tsx") ||
            id.includes("/src/pages/therapist/ClientFiles.tsx") ||
            id.includes("/src/pages/therapist/TherapistClients.tsx")
          ) {
            return "therapist-clients";
          }

          if (id.includes("/src/pages/therapist/TherapistResources.tsx")) {
            return "therapist-resources";
          }

          if (id.includes("/src/pages/therapist/TherapistTemplates.tsx")) {
            return "therapist-templates";
          }

          if (id.includes("/node_modules/react-router/") || id.includes("/node_modules/react-router-dom/")) {
            return "router";
          }

          if (id.includes("/node_modules/lucide-react/")) {
            return "ui-icons";
          }

          if (id.includes("node_modules/firebase/app") || id.includes("/@firebase/app/")) {
            return "firebase-app";
          }

          if (id.includes("node_modules/firebase/auth") || id.includes("/@firebase/auth/")) {
            return "firebase-auth";
          }

          if (id.includes("firebase/firestore/lite") || id.includes("/@firebase/firestore/dist/lite/")) {
            return "firebase-firestore-lite";
          }

          if (id.includes("node_modules/firebase/firestore") || id.includes("/@firebase/firestore/")) {
            return "firebase-firestore";
          }

          if (id.includes("node_modules/firebase/storage") || id.includes("/@firebase/storage/")) {
            return "firebase-storage";
          }

          if (id.includes("node_modules/firebase")) {
            return "firebase-core";
          }

          if (
            id.includes("expo-print") ||
            id.includes("expo-sharing")
          ) {
            return "export-tools";
          }

          if (
            id.includes("react-native-webview") ||
            id.includes("expo-av")
          ) {
            return "preview-media";
          }

          if (id.includes("/node_modules/@nivo/")) {
            const nivoPackage = id.split("/node_modules/@nivo/")[1]?.split("/")[0];
            if (["bar", "line", "pie", "radar"].includes(nivoPackage || "")) {
              return `charts-nivo-${nivoPackage}`;
            }

            return "charts-nivo-core";
          }

          if (id.includes("/node_modules/d3/")) {
            return "charts-d3";
          }

          if (
            id.includes("react-native-chart-kit") ||
            id.includes("victory-native") ||
            id.includes("@shopify/react-native-skia") ||
            id.includes("react-native-svg")
          ) {
            return "charts-native";
          }

          if (
            id.includes("moti") ||
            id.includes("react-native-reanimated") ||
            id.includes("motion")
          ) {
            return "motion";
          }

          if (
            id.includes("react-native-pell-rich-editor") ||
            id.includes("react-native-render-html") ||
            id.includes("react-native-markdown-display")
          ) {
            return "editor";
          }

          if (
            id.includes("/components/therapist/ExerciseBuilder") ||
            id.includes("/components/therapist/builder/")
          ) {
            return "therapist-builder";
          }

          if (
            id.includes("/components/therapist/") ||
            id.includes("/app/(app)/therapist/")
          ) {
            return "therapist";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single React instance across the full dependency graph
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
