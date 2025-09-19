import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-amap-editor": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  root: "example",
  server: {
    port: 5173,
  },
});
