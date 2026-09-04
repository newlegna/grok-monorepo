import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { hengshuApi } from "./server/api.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), hengshuApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
