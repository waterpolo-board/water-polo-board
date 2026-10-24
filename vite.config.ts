import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// base יחסי כדי שהאתר יעבוד גם תחת github.io/<repo>/
export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate", // גרסה חדשה נטענת לבד בפתיחה הבאה
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "לוח כדורמים",
        short_name: "לוח כדורמים",
        description: "לוח טקטי אינטראקטיבי לכדורמים",
        lang: "he",
        dir: "rtl",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        background_color: "#1e2c35",
        theme_color: "#1e2c35",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // הכול נשמר במכשיר: האפליקציה עובדת ליד הבריכה גם בלי קליטה
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { environment: "node" },
});
