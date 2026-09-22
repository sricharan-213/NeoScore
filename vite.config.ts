import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    hmr: false,
    strictPort: false,
    // Freebuff serves the preview through a proxied public hostname such as
    // "3000-<sandbox>.e2b.app". Vite rejects unknown Host headers by default
    // (DNS-rebinding protection), which surfaces as "Blocked request".
    // A leading dot allows the domain and all of its subdomains.
    allowedHosts: [".e2b.app"],
  },
});
