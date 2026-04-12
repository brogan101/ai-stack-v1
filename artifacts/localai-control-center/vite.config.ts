import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const API_PORT = Number(process.env.API_PORT ?? 3001);

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Internal path alias — @/... resolves to src/
      "@": path.resolve(import.meta.dirname, "src"),
      // Sovereign wiring — @workspace/api-client-react resolves to the local lib
      "@workspace/api-client-react": path.resolve(
        import.meta.dirname,
        "../../lib/api-client-react/src/index.ts",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      // All /api/* requests proxy to the Sovereign API server on port 3001
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    host: "0.0.0.0",
  },
});
