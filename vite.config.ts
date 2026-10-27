import { defineConfig } from "vite";

// Builds one ES module that Home Assistant loads as a custom panel.
// By default it goes into the integration, which serves it at /heating_panel/heating-panel.js (and is what
// HACS installs, so the built file is committed). Set HA_WWW to build into a www folder instead, served at
// /local/... for a panel_custom panel.
export default defineConfig({
  build: {
    lib: {
      entry: "src/heating-panel.ts",
      formats: ["es"],
      fileName: () => "heating-panel.js",
    },
    outDir: process.env.HA_WWW ?? "custom_components/heating_panel/frontend",
    emptyOutDir: false,
    sourcemap: Boolean(process.env.HA_WWW),
    target: "es2020",
  },
});
