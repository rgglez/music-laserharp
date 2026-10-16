import adapter from "@sveltejs/adapter-auto";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
  // The harp is linked with file:../.. and resolves to its real path, where
  // Svelte (an optional peer) is not installed. Resolve it from this project.
  resolve: { dedupe: ["svelte"] },
});
