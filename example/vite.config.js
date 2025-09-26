import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  css: {
    modules: false,
    preprocessorOptions: {
      css: {
        additionalData: `@import "../src/styles/index.css";`,
      },
    },
  },
  resolve: {
    alias: {
      "react-amap-editor":
        mode === "development"
          ? path.resolve(__dirname, "../src")
          : path.resolve(__dirname, "../dist"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
  optimizeDeps: {
    include: ["@/styles/index.css"],
  },
  server: {
    open: true,
  },
}));
