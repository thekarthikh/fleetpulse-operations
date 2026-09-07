// Explicit plugin configuration for TanStack Start + Netlify SSR deployment.
// The @netlify/vite-plugin-tanstack-start plugin must come BEFORE tanstackStart().
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    netlify(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
