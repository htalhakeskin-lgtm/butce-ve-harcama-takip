/**
 * Shares the app as a demo through a Cloudflare Quick Tunnel (no account needed).
 *
 *   pnpm demo:share            build once, start, print the public link
 *   pnpm demo:share --rebuild  rebuild first (after code changes)
 *   pnpm demo:share --reset    recreate the demo account and its sample data
 *
 * The link works only while this command runs and the computer is on; it changes on every start.
 * The server runs as a production build on port 3200, separate from `pnpm dev`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const PORT = 3200;
const DIST_DIR = ".next-demo";
const DEMO_EMAIL = "deneme@example.com";
const DEMO_PASSWORD = "Deneme-Butce-2026";
const args = new Set(process.argv.slice(2));
const isWindows = process.platform === "win32";
const children = [];

function log(message) {
  console.warn(`[demo] ${message}`);
}

function run(command, commandArgs, env = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(" ")} failed`);
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
}

function findCloudflared() {
  const fromPath = spawnSync(isWindows ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (fromPath.status === 0) return fromPath.stdout.split(/\r?\n/)[0].trim();
  const windowsDefault = "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";
  if (isWindows && existsSync(windowsDefault)) return windowsDefault;
  throw new Error("cloudflared not found. Install it: winget install --id Cloudflare.cloudflared");
}

async function demoUserExists() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    const rows = await sql`select 1 from users where email = ${DEMO_EMAIL} limit 1`;
    return rows.length > 0;
  } finally {
    await sql.end();
  }
}

function startTunnel(binary) {
  return new Promise((resolve, reject) => {
    const tunnel = spawn(binary, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`]);
    children.push(tunnel);
    const timer = setTimeout(() => reject(new Error("The tunnel did not report an address within 60 s")), 60_000);
    const onData = (chunk) => {
      const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(chunk));
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    tunnel.stdout.on("data", onData);
    tunnel.stderr.on("data", onData);
    tunnel.on("exit", (code) => reject(new Error(`cloudflared exited (${code})`)));
  });
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The server did not become healthy within 2 minutes");
}

async function main() {
  process.on("SIGINT", () => {
    log("Stopping…");
    stopAll();
    process.exit(0);
  });

  log("Checking the database (docker compose)…");
  run("docker", ["compose", "up", "-d", "--wait"]);
  run("pnpm", ["db:migrate"]);

  if (args.has("--reset") || !(await demoUserExists())) {
    log("Creating the demo account with sample data…");
    run("pnpm", ["db:seed"]);
  }

  if (args.has("--rebuild") || !existsSync(DIST_DIR)) {
    log(`Building into ${DIST_DIR} (about a minute)…`);
    run("pnpm", ["build"], { NEXT_DIST_DIR: DIST_DIR });
  }

  log("Opening the Cloudflare tunnel…");
  const url = await startTunnel(findCloudflared());

  log("Starting the server…");
  const server = spawn("pnpm", ["exec", "next", "start", "--port", String(PORT)], {
    shell: isWindows,
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      NEXT_DIST_DIR: DIST_DIR,
      APP_URL: url,
      DEMO_ACCOUNT_EMAIL: DEMO_EMAIL,
      DEMO_ACCOUNT_PASSWORD: DEMO_PASSWORD,
      EMAIL_TRANSPORT: "file",
    },
  });
  children.push(server);
  server.on("exit", (code) => {
    log(`Server stopped (${code}).`);
    stopAll();
    process.exit(code ?? 1);
  });
  await waitForHealth();

  console.warn(`
  ┌──────────────────────────────────────────────────────────────┐
    Demo is live:  ${url}

    E-posta:  ${DEMO_EMAIL}
    Şifre:    ${DEMO_PASSWORD}
    (The login page fills these in automatically.)

    The link works while this window stays open. Ctrl+C stops it.
  └──────────────────────────────────────────────────────────────┘
`);
}

main().catch((error) => {
  console.error(`[demo] ${error.message}`);
  stopAll();
  process.exit(1);
});
