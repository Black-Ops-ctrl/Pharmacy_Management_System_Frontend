import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:2195";
  const proxy = { "/api": { target: backend, changeOrigin: true } };
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 2196, host: true, strictPort: true, proxy },
    preview: { port: 2196, host: true, strictPort: true, proxy },
  };
});
