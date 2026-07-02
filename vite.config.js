import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/recommend": "http://localhost:3001",
    },
  },
});
