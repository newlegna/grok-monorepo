import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { systemOneApi } from "./server/plugin.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), systemOneApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
