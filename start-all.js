import { spawn } from "child_process";

const fetchJson = async (url) => {
  try {
    const r = await fetch(url, { method: "GET" });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
};

const startProc = (cmd, cwd) => {
  const [bin, ...args] = cmd.split(" ");
  const p = spawn(bin, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  p.on("exit", (code) => process.stdout.write(`process exited ${code}\n`));
  p.on("error", (e) => process.stdout.write(`process error ${e?.message || "unknown"}\n`));
  return p;
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const ensureServer = async () => {
  let ok = await fetchJson("http://localhost:4000/health");
  if (!ok.ok) startProc("npm start", "./server");
  for (let i = 0; i < 10; i++) {
    ok = await fetchJson("http://localhost:4000/health");
    if (ok.ok) break;
    await wait(500);
  }
  return ok.ok;
};

const ensureClient = async () => {
  let ok = await fetchJson("http://localhost:3000/");
  if (!ok.ok) startProc("npm start", ".");
  for (let i = 0; i < 20; i++) {
    ok = await fetchJson("http://localhost:3000/");
    if (ok.ok) break;
    await wait(500);
  }
  return ok.ok;
};

const run = async () => {
  const s = await ensureServer();
  const c = await ensureClient();
  process.stdout.write(`backend:${s} frontend:${c}\n`);
};

run(); 
