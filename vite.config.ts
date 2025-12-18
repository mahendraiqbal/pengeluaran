import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
