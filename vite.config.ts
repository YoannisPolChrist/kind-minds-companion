import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Prevent react-native / expo packages from pulling in their own React
      "react-native": path.resolve(__dirname, "node_modules/react-native-web"),
    },
    // Force single React instance across all dependencies
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    exclude: ["react-native"],
  },
});
