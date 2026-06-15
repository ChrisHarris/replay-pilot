import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const apiPort = Number(process.env.REPLAYPILOT_API_PORT || 4578);
const uiPort = Number(process.env.REPLAYPILOT_UI_PORT || 4577);
const host = "127.0.0.1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let currentProcess = null;
let currentStatus = {
  state: "idle",
  message: "Runner is ready.",
  log: [],
  artifacts: []
};

function log(message) {
  currentStatus.log = [
    ...(currentStatus.log || []),
    { time: new Date().toISOString(), message }
  ].slice(-200);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function listArtifacts() {
  const resultDir = join(rootDir, "test-results");
  await mkdir(resultDir, { recursive: true });
  const entries = await readdir(resultDir, { recursive: true });
  const artifacts = [];

  for (const entry of entries) {
    const path = join(resultDir, entry);
    const info = await stat(path);
    if (info.isFile()) {
      artifacts.push({
        name: entry,
        path,
        url: `/artifacts/${encodeURIComponent(entry)}`
      });
    }
  }

  return artifacts;
}

function runPlaywright(settings) {
  if (currentProcess) {
    throw new Error("A run is already in progress.");
  }

  currentStatus = {
    state: "running",
    message: `Running ${settings.scenarioPack} against ${settings.targetUrl}`,
    startedAt: new Date().toISOString(),
    log: [],
    artifacts: []
  };
  log(currentStatus.message);

  const env = {
    ...process.env,
    REPLAYPILOT_TARGET_URL: settings.targetUrl,
    REPLAYPILOT_VIEWPORT_WIDTH: String(settings.viewportWidth || 393),
    REPLAYPILOT_VIEWPORT_HEIGHT: String(settings.viewportHeight || 852)
  };

  currentProcess = spawn(npmCommand, ["run", "test:sample"], {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const started = Date.now();
  currentProcess.stdout.on("data", (data) => log(data.toString("utf8").trim()));
  currentProcess.stderr.on("data", (data) => log(data.toString("utf8").trim()));
  currentProcess.on("close", async (exitCode) => {
    currentStatus = {
      ...currentStatus,
      state: exitCode === 0 ? "finished" : "failed",
      message: exitCode === 0 ? "Run completed." : "Run failed.",
      result: {
        exitCode,
        durationMs: Date.now() - started
      },
      artifacts: await listArtifacts()
    };
    log(currentStatus.message);
    currentProcess = null;
  });
}

const api = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${host}:${apiPort}`);

  try {
    if (req.method === "GET" && url.pathname === "/status") {
      sendJson(res, 200, { status: currentStatus });
      return;
    }

    if (req.method === "POST" && url.pathname === "/run") {
      runPlaywright(await readJson(req));
      sendJson(res, 202, { status: currentStatus });
      return;
    }

    if (req.method === "POST" && url.pathname === "/cancel") {
      if (currentProcess) currentProcess.kill("SIGTERM");
      currentProcess = null;
      currentStatus = { ...currentStatus, state: "cancelled", message: "Run cancelled." };
      log("Run cancelled.");
      sendJson(res, 200, { status: currentStatus });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    currentStatus = { ...currentStatus, state: "failed", message: error.message };
    sendJson(res, 500, { error: error.message, status: currentStatus });
  }
});

api.listen(apiPort, host, () => {
  console.log(`ReplayPilot API: http://${host}:${apiPort}`);
});

const ui = spawn(npmCommand, ["run", "dev", "--", "--host", host, "--port", String(uiPort), "--strictPort"], {
  cwd: rootDir,
  stdio: "inherit"
});

console.log(`ReplayPilot UI: http://${host}:${uiPort}`);

function shutdown() {
  if (currentProcess) currentProcess.kill("SIGTERM");
  ui.kill("SIGTERM");
  api.close();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
