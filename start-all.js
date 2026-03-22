import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fetchJson = async (url) => {
  try {
    const r = await fetch(url, { method: "GET" });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

let backendProc = null;
let lastStart = Date.now();

const startBackend = () => {
  const serverDir = resolve(__dirname, "server");
  process.stdout.write(`[start-all] Starting backend... ${new Date().toLocaleTimeString()}\n`);
  lastStart = Date.now();
  const p = spawn("node", ["src/index.js"], {
    cwd: serverDir,
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  });
  p.on("exit", (code) => {
    const runtime = Date.now() - lastStart;
    const isFast = runtime < 5000;
    process.stdout.write(`\n[start-all] Backend exited (code ${code}) after ${runtime}ms. ${isFast ? "Crash protection: Waiting 10s before restart." : "Restarting in 2s."}\n`);
    setTimeout(() => {
      try { backendProc = startBackend(); } catch (err) {}
    }, isFast ? 10000 : 2000);
  });
  p.on("error", (e) => process.stdout.write(`[start-all] Backend error: ${e?.message || "unknown"}\n`));
  return p;
};

const startFrontend = () => {
  process.stdout.write(`[start-all] Starting frontend...\n`);
  const p = spawn("npx", ["react-scripts", "start"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, BROWSER: "none" },
  });
  p.on("exit", (code) => process.stdout.write(`[start-all] Frontend exited (code ${code})\n`));
  p.on("error", (e) => process.stdout.write(`[start-all] Frontend error: ${e?.message || "unknown"}\n`));
  return p;
};

const ensureServerUp = async (retries = 20) => {
  for (let i = 0; i < retries; i++) {
    const ok = await fetchJson("http://localhost:4000/health");
    if (ok.ok) return true;
    await wait(500);
  }
  return false;
};

(async () => {
  backendProc = startBackend();
  const up = await ensureServerUp();
  if (up) {
    const frontendProc = startFrontend();
    process.on("SIGINT", () => {
      backendProc?.kill();
      frontendProc?.kill();
      process.exit();
    });
  } else {
    process.stdout.write("[start-all] Backend failed to healthcheck. Please check logs.\n");
  }
})();
