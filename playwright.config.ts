import { defineConfig, devices } from "@playwright/test";

// Deliberately not 5000/8000: this repo's normal `npm run dev` / `make run`
// point at production (see .env), and a real instance may already be
// running on those ports. Isolated ports guarantee Playwright never talks
// to — or collides with — that instance.
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT) || 5050;
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT) || 8010;
const BACKEND_DIR = process.env.E2E_BACKEND_DIR || "../groceror";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Both servers point at an isolated SQLite DB (see scripts/run_e2e_server.py
  // in the backend repo) — never the real Postgres/Fly.io targets in .env.
  webServer: [
    {
      command: `${BACKEND_DIR}/venv/bin/python scripts/run_e2e_server.py`,
      cwd: BACKEND_DIR,
      url: `http://localhost:${BACKEND_PORT}/`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        E2E_SQLITE_PATH: process.env.E2E_SQLITE_PATH || "/tmp/test_groceror_e2e.db",
        E2E_BACKEND_PORT: String(BACKEND_PORT),
      },
    },
    {
      command: "npm run dev",
      cwd: process.cwd(),
      url: `http://localhost:${FRONTEND_PORT}/`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: String(FRONTEND_PORT),
        VITE_API_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
