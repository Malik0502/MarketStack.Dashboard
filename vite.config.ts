import path from "path"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import {tanstackRouter} from '@tanstack/router-vite-plugin'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
