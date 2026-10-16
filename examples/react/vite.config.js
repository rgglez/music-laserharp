import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The harp is linked with file:../.. and resolves to its real path, where
  // React (an optional peer) is not installed. Resolve it from this project.
  resolve: { dedupe: ["react", "react-dom"] },
});
