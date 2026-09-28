import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative base so the app also works when served from a subpath
  // (one Cloudflare Pages project for the whole monorepo).
  base: "./",
  plugins: [react(), tailwindcss()],
});
