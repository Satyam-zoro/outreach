// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      allowedHosts: true,

      proxy: {
        "/api/notion": {
          target: "https://api.notion.com/v1",
          changeOrigin: true,
          rewrite: (urlPath) => {
            try {
              const url = new URL(urlPath, "http://localhost");
              const queryPath = url.searchParams.get("path");
              if (queryPath) {
                return queryPath.startsWith("/") ? queryPath : `/${queryPath}`;
              }
            } catch {}
            return urlPath.replace(/^\/api\/notion/, "") || "/";
          },
        },
      },
    },
  },

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});