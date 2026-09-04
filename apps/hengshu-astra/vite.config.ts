import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { hengshuApi } from "./server/api.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), hengshuApi()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
})
