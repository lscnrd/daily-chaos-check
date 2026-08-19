import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Notifications and service workers require a secure context. When
    // testing on your phone over LAN, use `npm run dev -- --host` and
    // accept that notifications won't work until it's deployed to https.
    host: true,
  },
});
