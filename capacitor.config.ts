import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the static Vite build only — the Express server in
// server/ is dev/demo tooling and isn't part of the mobile bundle.
// The webview talks straight to the FastAPI backend via VITE_API_URL,
// same as the browser build (see client/src/lib/queryClient.ts).
const config: CapacitorConfig = {
  appId: "com.groceror.app",
  appName: "Groceror",
  webDir: "dist/public",
};

export default config;
