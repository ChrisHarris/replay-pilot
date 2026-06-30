import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { defaultCapture, getOutputQuality } from "../src/lib/projectDefaults.js";
import { normaliseInstructionIndentation } from "../src/lib/instructionFormatting.js";
import { instructionsToPlaywrightScript } from "../src/lib/instructionScript.js";
import {
  parseProjectsFile,
  REMOVED_FOLDER_SUFFIX,
  removedScenarioFolderName,
  serializeProjects,
  serializeScenario,
  slugify,
  visibleProjects
} from "../src/lib/projectsMarkdown.js";
import { muxSubtitleTrack } from "./subtitle-mux.mjs";
import {
  captionTextFromConsoleArgs,
  createCaptionTimeline,
  serializeSrt,
  serializeVtt,
  syncActionCaption
} from "./subtitle-utils.mjs";
import { createScreencastOptions, frameMimeTypeFor, h264Crf, inputCodecFor } from "./video-output.mjs";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const projectsDir = join(rootDir, "Projects");
const projectsPath = join(projectsDir, "projects.md");
const emitInteractionsPath = join(rootDir, "public", "emit-interactions.js");
const apiPort = Number(process.env.REPLAY_PILOT_API_PORT || 4578);
const uiPort = Number(process.env.REPLAY_PILOT_UI_PORT || 4577);
const host = "127.0.0.1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const captureFps = 30;

let currentRun = null;
let currentRunControl = null;
let livePreviewFrame = "";
let livePreviewAction = null;
const livePreviewClients = new Set();
const removedSuffix = REMOVED_FOLDER_SUFFIX;
const removedFolderSuffixes = [removedSuffix, " **removed**"];

const livePreviewHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Live Playwright preview</title>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #111; }
      body { display: grid; place-items: center; font: 14px system-ui, sans-serif; color: #eee; }
      img { width: 100%; height: 100%; display: none; object-fit: contain; }
      #status { position: absolute; padding: 0.65rem 0.85rem; border-radius: 0.5rem; background: rgb(0 0 0 / 72%); text-align: center; }
    </style>
  </head>
  <body>
    <img id="preview" alt="Live Playwright browser preview">
    <div id="status" role="status">Starting Playwright browser…</div>
    <script>
      const preview = document.querySelector('#preview');
      const status = document.querySelector('#status');
      const events = new EventSource('/runs/live/events');

      events.addEventListener('frame', (event) => {
        preview.src = event.data;
        preview.style.display = 'block';
        status.hidden = true;
      });

      events.addEventListener('waiting', () => {
        preview.style.display = 'none';
        status.hidden = false;
        status.textContent = 'Starting Playwright browser…';
      });

      events.addEventListener('finished', () => {
        status.hidden = false;
        status.textContent = 'Finalising recording…';
      });

      events.onerror = () => {
        if (!preview.src) {
          status.hidden = false;
          status.textContent = 'Waiting for the live preview…';
        }
      };
    </script>
  </body>
</html>`;

function writeLivePreviewEvent(res, eventName, data = "") {
  if (res.destroyed || res.writableEnded) return false;
  return res.write(`event: ${eventName}\ndata: ${data}\n\n`);
}

function broadcastLivePreviewEvent(eventName, data = "") {
  for (const res of livePreviewClients) {
    if (res.destroyed || res.writableEnded) {
      livePreviewClients.delete(res);
      continue;
    }
    if (eventName === "frame" && res.writableNeedDrain) continue;
    writeLivePreviewEvent(res, eventName, data);
  }
}

function beginLivePreview() {
  livePreviewFrame = "";
  livePreviewAction = null;
  broadcastLivePreviewEvent("waiting");
}

function finishLivePreview() {
  broadcastLivePreviewEvent("finished");
}

function createMp4FrameRecorder(outputPath, outputQuality) {
  const inputCodec = inputCodecFor(outputQuality);
  const frameMimeType = frameMimeTypeFor(outputQuality);
  const ffmpeg = spawn(getFfmpegPath(), [
    "-y",
    "-loglevel", "error",
    "-f", "image2pipe",
    "-framerate", String(captureFps),
    "-vcodec", inputCodec,
    "-i", "pipe:0",
    "-an",
    "-c:v", "libx264",
    "-crf", String(h264Crf),
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black",
    "-pix_fmt", "yuv420p",
    "-r", String(captureFps),
    "-movflags", "+faststart",
    outputPath
  ], { stdio: ["pipe", "ignore", "pipe"] });

  let aborted = false;
  let frameCount = 0;
  let latestFrame = null;
  let latestFrameData = "";
  let timer = null;
  let stderr = "";

  ffmpeg.stderr.on("data", (data) => {
    stderr += data.toString("utf8");
  });
  ffmpeg.stdin.on("error", (error) => {
    if (!aborted) stderr += `${stderr ? "\n" : ""}${error.message}`;
  });

  const completion = new Promise((resolvePromise, reject) => {
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (exitCode) => {
      if (aborted || exitCode === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(stderr.trim() || `FFmpeg exited with code ${exitCode}`));
    });
  });
  completion.catch(() => {});

  function writeFrame() {
    if (!latestFrame || ffmpeg.stdin.destroyed || ffmpeg.stdin.writableEnded) return;
    ffmpeg.stdin.write(latestFrame);
    frameCount += 1;
    livePreviewFrame = latestFrameData;
    broadcastLivePreviewEvent("frame", latestFrameData);
  }

  return {
    updateFrame(data) {
      if (aborted) return;
      latestFrameData = `data:${frameMimeType};base64,${data}`;
      latestFrame = Buffer.from(data, "base64");
      if (timer) return;

      writeFrame();
      timer = setInterval(writeFrame, 1000 / captureFps);
    },
    getCurrentTime() {
      return frameCount > 0 ? (frameCount - 1) / captureFps : 0;
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;

      if (aborted) {
        await completion;
        return { frameCount: 0 };
      }
      if (!latestFrame || frameCount === 0) {
        ffmpeg.stdin.destroy();
        ffmpeg.kill("SIGTERM");
        await completion.catch(() => {});
        throw new Error("Chromium did not produce any screencast frames.");
      }

      ffmpeg.stdin.end();
      await completion;
      return { frameCount };
    },
    async abort() {
      if (!aborted) {
        aborted = true;
        if (timer) clearInterval(timer);
        timer = null;
        ffmpeg.stdin.destroy();
        ffmpeg.kill("SIGTERM");
      }
      await completion.catch(() => {});
    }
  };
}

async function startPlaywrightScreencast(page, viewport, outputQuality, onFrame) {
  const session = await page.context().newCDPSession(page);

  session.on("Page.screencastFrame", ({ data, sessionId }) => {
    session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    onFrame(data);
  });

  await session.send("Page.startScreencast", createScreencastOptions(viewport, outputQuality));

  return async () => {
    await session.send("Page.stopScreencast").catch(() => {});
    await session.detach().catch(() => {});
  };
}

function getFfmpegPath() {
  return ffmpegStaticPath || "ffmpeg";
}

async function checkPlaywrightInstall() {
  const executablePath = chromium.executablePath();
  const ffmpegPath = getFfmpegPath();
  const checks = {
    chromium: await pathExists(executablePath),
    ffmpeg: await pathExists(ffmpegPath)
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    ok,
    command: "npm run setup:browsers",
    checks,
    details: ok ? "" : "Replay Pilot recording tools are missing.",
    executablePath,
    ffmpegPath
  };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readProjectState() {
  try {
    return parseProjectsFile(await readFile(projectsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      await mkdir(projectsDir, { recursive: true });
      await writeFile(projectsPath, "# Replay Pilot Projects\n");
      return { projects: [], preferences: { projectId: "", scenarioId: "", subtitles: true } };
    }
    throw error;
  }
}

async function writeProjectState(projects, preferences = {}) {
  await mkdir(projectsDir, { recursive: true });
  await writeFile(projectsPath, serializeProjects(projects, preferences));
}

function getPreferredSelection(projects, preferences = {}) {
  const selectableProjects = visibleProjects(projects);
  const preferredProject = selectableProjects.find((project) => project.id === preferences.projectId);
  const preferredScenario = preferredProject?.scenarios?.find((scenario) => scenario.id === preferences.scenarioId);
  if (preferredProject && preferredScenario) {
    return {
      projectId: preferredProject.id,
      scenarioId: preferredScenario.id,
      subtitles: preferences.subtitles !== false
    };
  }

  const firstProject = selectableProjects.find((project) => project.scenarios?.length);
  const firstScenario = firstProject?.scenarios?.[0];
  return {
    projectId: firstProject?.id || "",
    scenarioId: firstScenario?.id || "",
    subtitles: preferences.subtitles !== false
  };
}

function defaultSmokeScenario() {
  return {
    id: "smoke-test",
    name: "Smoke Test",
    instructions: `# Open App
- Open App:
  - Wait 5 seconds`,
    script: `await page.goto(project.url, { waitUntil: "networkidle" });
await page.waitForTimeout(5000);`
  };
}

function uniqueId(base, existingIds) {
  let id = base;
  let index = 2;
  while (existingIds.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function projectFolderName(project, removed = Boolean(project?.removed)) {
  return `${slugify(project?.id || project?.name)}${removed ? removedSuffix : ""}`;
}

function projectFolderPath(project, removed = Boolean(project?.removed)) {
  return join(projectsDir, projectFolderName(project, removed));
}

function projectFolderPathCandidates(project) {
  const baseName = slugify(project?.id || project?.name);
  if (!project?.removed) return [join(projectsDir, baseName)];
  return removedFolderSuffixes.map((suffix) => join(projectsDir, `${baseName}${suffix}`));
}

async function existingProjectFolderPath(project) {
  for (const folderPath of projectFolderPathCandidates(project)) {
    if (await pathExists(folderPath)) return folderPath;
  }
  return "";
}

async function renameProjectFolder(fromProject, toProject) {
  const fromPath = await existingProjectFolderPath(fromProject) || projectFolderPath(fromProject);
  const toPath = projectFolderPath(toProject);
  if (fromPath === toPath) {
    await mkdir(toPath, { recursive: true });
    return;
  }

  if (await pathExists(fromPath)) {
    if (await pathExists(toPath)) return;
    await rename(fromPath, toPath);
    return;
  }

  await mkdir(toPath, { recursive: true });
}

function activeProjectFolderPath(project) {
  return projectFolderPath({ ...project, removed: false }, false);
}

function activeScenarioFolderPath(project, scenario) {
  return join(activeProjectFolderPath(project), slugify(scenario?.id || scenario?.name || "scenario"));
}

async function nextRemovedScenarioFolder(project, scenario) {
  let copyIndex = 1;
  while (true) {
    const name = removedScenarioFolderName(scenario, copyIndex);
    const path = join(activeProjectFolderPath(project), name);
    if (!await pathExists(path)) return { name, path };
    copyIndex += 1;
  }
}

async function archiveScenario(project, scenario) {
  const activePath = activeScenarioFolderPath(project, scenario);
  const archive = await nextRemovedScenarioFolder(project, scenario);
  await mkdir(activeProjectFolderPath(project), { recursive: true });

  if (await pathExists(activePath)) await rename(activePath, archive.path);
  else await mkdir(archive.path, { recursive: true });

  await writeFile(join(archive.path, "scenario.md"), serializeScenario(scenario));
  return archive.name;
}

async function ensureSavedProjectFolder(existing, nextProject) {
  if (existing) {
    await renameProjectFolder(existing, nextProject);
    return;
  }

  const removedFolderProject = { ...nextProject, removed: true };
  if (await existingProjectFolderPath(removedFolderProject)) {
    await renameProjectFolder(removedFolderProject, nextProject);
    return;
  }

  await renameProjectFolder(nextProject, nextProject);
}

async function saveProject(projectInput) {
  const state = await readProjectState();
  const projects = state.projects;
  const projectName = projectInput.name?.trim() || "Untitled Project";
  const existing = projects.find((project) => project.id === projectInput.id)
    || projects.find((project) => project.removed && project.name === projectName);
  const restoringByName = !projectInput.id && existing?.removed && existing.name === projectName;
  const id = existing
    ? existing.id
    : uniqueId(slugify(projectName), new Set(projects.map((project) => project.id)));

  const nextProject = {
    id,
    name: projectName,
    removed: false,
    icon: restoringByName ? existing.icon : projectInput.icon?.trim() || "mobile-alt",
    url: restoringByName ? existing.url : projectInput.url?.trim() || "http://localhost:5173",
    capture: {
      width: Number((restoringByName ? existing.capture?.width : projectInput.capture?.width) || defaultCapture.width),
      height: Number((restoringByName ? existing.capture?.height : projectInput.capture?.height) || defaultCapture.height),
      resolution: Number((restoringByName ? existing.capture?.resolution : projectInput.capture?.resolution) || defaultCapture.resolution),
      outputQuality: getOutputQuality(
        restoringByName ? existing.capture?.outputQuality : projectInput.capture?.outputQuality
      ).value
    },
    scenarios: existing?.scenarios?.length ? existing.scenarios : [defaultSmokeScenario()]
  };

  const nextProjects = existing
    ? projects.map((project) => project.id === id ? nextProject : project)
    : [...projects, nextProject];

  const selectedScenario = nextProject.scenarios?.[0];
  const preferences = getPreferredSelection(nextProjects, selectedScenario
    ? { ...state.preferences, projectId: nextProject.id, scenarioId: selectedScenario.id }
    : state.preferences);

  await ensureSavedProjectFolder(existing, nextProject);
  await writeProjectState(nextProjects, preferences);

  return { project: nextProject, projects: visibleProjects(nextProjects), preferences };
}

async function removeProject(projectId) {
  const state = await readProjectState();
  const projects = state.projects;
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  const activeProject = { ...project, removed: false };
  project.removed = true;

  const preferences = getPreferredSelection(projects, state.preferences);
  await renameProjectFolder(activeProject, project);
  await writeProjectState(projects, preferences);
  return { project, projects: visibleProjects(projects), preferences };
}

async function saveScenario(projectId, scenarioInput) {
  const state = await readProjectState();
  const projects = state.projects;
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  const existing = project.scenarios.find((scenario) => scenario.id === scenarioInput.id);
  const scenarioId = existing
    ? existing.id
    : uniqueId(slugify(scenarioInput.name || "Smoke Test"), new Set(project.scenarios.map((scenario) => scenario.id)));

  const scenario = {
    id: scenarioId,
    name: scenarioInput.name?.trim() || "Smoke Test",
    instructions: normaliseInstructionIndentation(scenarioInput.instructions || ""),
    script: scenarioInput.script || ""
  };

  project.scenarios = existing
    ? project.scenarios.map((item) => item.id === scenarioId ? scenario : item)
    : [...project.scenarios, scenario];

  const preferences = getPreferredSelection(projects, {
    ...state.preferences,
    projectId: project.id,
    scenarioId
  });
  await writeProjectState(projects, preferences);
  return { project, scenario, projects: visibleProjects(projects), preferences };
}

async function removeScenario(projectId, scenarioId) {
  const state = await readProjectState();
  const projects = state.projects;
  const project = projects.find((item) => item.id === projectId && !item.removed);
  if (!project) throw new Error("Project not found.");

  const scenarioIndex = project.scenarios.findIndex((item) => item.id === scenarioId);
  if (scenarioIndex < 0) throw new Error("Scenario not found.");

  const [scenario] = project.scenarios.splice(scenarioIndex, 1);
  const archiveFolder = await archiveScenario(project, scenario);
  const nextScenario = project.scenarios[Math.min(scenarioIndex, project.scenarios.length - 1)];
  const preferences = getPreferredSelection(projects, nextScenario
    ? { ...state.preferences, projectId: project.id, scenarioId: nextScenario.id }
    : { ...state.preferences, projectId: "", scenarioId: "" });

  await writeProjectState(projects, preferences);
  return { project, scenario, archiveFolder, projects: visibleProjects(projects), preferences };
}

async function ensureScenarioScript(projectId, scenarioId) {
  const state = await readProjectState();
  const projects = state.projects;
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  const scenario = project.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error("Scenario not found.");

  const generatedScript = instructionsToPlaywrightScript(scenario.instructions);
  if (scenario.script !== generatedScript) {
    scenario.script = generatedScript;
    await writeProjectState(projects, state.preferences);
  }

  return { project, scenario, projects };
}

async function savePreferences(preferencesInput) {
  const state = await readProjectState();
  const preferences = getPreferredSelection(state.projects, {
    ...state.preferences,
    ...preferencesInput
  });
  await writeProjectState(state.projects, preferences);
  return { projects: visibleProjects(state.projects), preferences };
}

async function listRuns(projectId, scenarioId) {
  const state = await readProjectState();
  const project = visibleProjects(state.projects).find((item) => item.id === projectId);
  if (!project) return [];

  const scenario = project.scenarios?.find((item) => item.id === scenarioId);
  const projectPath = activeProjectFolderPath(project);
  const entries = await readdir(projectPath, { withFileTypes: true }).catch(() => []);
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const runPath = join(projectPath, entry.name, "run.json");
    try {
      const run = JSON.parse(await readFile(runPath, "utf8"));
      if (run.projectId !== project.id) continue;
      if (scenarioId && run.scenarioId !== scenarioId) continue;

      runs.push({
        id: run.id || entry.name,
        projectId: run.projectId,
        scenarioId: run.scenarioId,
        scenarioName: scenario?.name || run.scenarioId,
        status: run.status || "finished",
        videoUrl: run.videoUrl,
        mp4Url: run.mp4Url,
        subtitleUrl: run.subtitleUrl,
        screenshotUrl: run.screenshotUrl,
        viewport: run.viewport || project.capture || defaultCapture,
        deviceScaleFactor: run.deviceScaleFactor,
        error: run.error,
        finishedAt: run.finishedAt || run.id || entry.name
      });
    } catch {
      // Ignore incomplete or manually edited run folders.
    }
  }

  return runs.sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));
}

function createScriptRunner(script) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction("page", "project", "scenario", "expect", "helpers", "console", script);
}

function createScenarioConsole(onCaption) {
  return {
    debug: console.debug.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    log(...args) {
      const caption = captionTextFromConsoleArgs(args);
      if (caption !== null) {
        onCaption(caption);
        return;
      }
      console.log(...args);
    },
    warn: console.warn.bind(console)
  };
}

function sanitizeFilename(value) {
  return slugify(value).replace(/^-+|-+$/g, "") || "run";
}

async function runScenario(projectId, scenarioId) {
  if (currentRun) throw new Error("A scenario is already running.");

  const control = {
    runDir: "",
    browser: null,
    cancelRequested: false,
    context: null,
    recorder: null
  };

  currentRun = (async () => {
    const { project, scenario, projects } = await ensureScenarioScript(projectId, scenarioId);
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const runDir = join(activeProjectFolderPath(project), runId);
    control.runDir = runDir;
    await mkdir(runDir, { recursive: true });

    const viewport = {
      width: Number(project.capture?.width || defaultCapture.width),
      height: Number(project.capture?.height || defaultCapture.height)
    };
    const deviceScaleFactor = Number(project.capture?.resolution || defaultCapture.resolution);
    const outputQuality = getOutputQuality(project.capture?.outputQuality);
    const mp4Filename = `${sanitizeFilename(scenario.name)}.mp4`;
    const finalMp4Path = join(runDir, mp4Filename);
    const pendingMp4Path = join(runDir, `${sanitizeFilename(scenario.name)}.pending.mp4`);
    const captionedMp4Path = join(runDir, `${sanitizeFilename(scenario.name)}.captioned.pending.mp4`);
    const subtitlePath = join(runDir, `${sanitizeFilename(scenario.name)}.captions.srt`);
    const subtitleVttFilename = `${sanitizeFilename(scenario.name)}.captions.vtt`;
    const subtitleVttPath = join(runDir, subtitleVttFilename);
    const browser = await chromium.launch({ headless: true });
    beginLivePreview();
    control.browser = browser;
    const recorder = createMp4FrameRecorder(pendingMp4Path, outputQuality);
    const captionTimeline = createCaptionTimeline(() => recorder.getCurrentTime());
    control.recorder = recorder;
    let recordingSaved = false;
    let subtitleSaved = false;
    let screenshotPath = "";
    let runError = null;

    try {
      if (control.cancelRequested) throw new Error("Recording cancelled.");
      const context = await browser.newContext({ viewport, deviceScaleFactor });
      control.context = context;
      const page = await context.newPage();
      let stopScreencast = async () => {};
      try {
        stopScreencast = await startPlaywrightScreencast(page, viewport, outputQuality, recorder.updateFrame);
      } catch (error) {
        runError = error;
      }
      const helpers = {
        caption: (text) => captionTimeline.add(text),
        async step(index, text) {
          livePreviewAction = syncActionCaption(captionTimeline, index, text);
          broadcastLivePreviewEvent("action", JSON.stringify(livePreviewAction));
          await new Promise((resolveStep) => setImmediate(resolveStep));
        },
        wait: (ms) => page.waitForTimeout(ms),
        seconds: (seconds) => page.waitForTimeout(seconds * 1000)
      };
      const scenarioConsole = createScenarioConsole((text) => captionTimeline.add(text));
      try {
        if (control.cancelRequested) throw new Error("Recording cancelled.");
        await createScriptRunner(scenario.script)(page, project, scenario, expect, helpers, scenarioConsole);
      } catch (error) {
        runError = error;
      } finally {
        if (!control.cancelRequested) {
          screenshotPath = join(runDir, `${sanitizeFilename(scenario.name)}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        }
        await stopScreencast();
        if (!control.cancelRequested) {
          try {
            const { frameCount } = await recorder.stop();
            const captions = captionTimeline.finish(frameCount / captureFps);
            if (captions.length) {
              await writeFile(subtitlePath, serializeSrt(captions));
              await muxSubtitleTrack(pendingMp4Path, subtitlePath, captionedMp4Path);
              await rm(pendingMp4Path, { force: true });
              await rename(captionedMp4Path, finalMp4Path);
              try {
                await writeFile(subtitleVttPath, serializeVtt(captions));
                subtitleSaved = true;
              } catch (error) {
                console.warn(`Could not save WebVTT captions: ${error.message}`);
              }
            } else {
              await rename(pendingMp4Path, finalMp4Path);
            }
            recordingSaved = true;
          } catch (error) {
            await rm(pendingMp4Path, { force: true }).catch(() => {});
            await rm(captionedMp4Path, { force: true }).catch(() => {});
            await rm(subtitleVttPath, { force: true }).catch(() => {});
            runError = error;
          } finally {
            await rm(subtitlePath, { force: true }).catch(() => {});
          }
        }
        await context.close().catch(() => {});
        control.context = null;
      }
    } finally {
      if (!recordingSaved) await recorder.abort();
      await browser.close().catch(() => {});
      control.browser = null;
      control.recorder = null;
      finishLivePreview();
    }

    if (control.cancelRequested) {
      await rm(runDir, { recursive: true, force: true });
      return {
        project,
        scenario,
        projects: visibleProjects(projects),
        run: {
          id: runId,
          projectId: project.id,
          scenarioId: scenario.id,
          status: "cancelled",
          finishedAt: new Date().toISOString()
        }
      };
    }

    const relativeMp4Path = `${project.id}/${runId}/${mp4Filename}`;
    const recordingUrl = recordingSaved ? `/recordings/${relativeMp4Path}` : undefined;
    const subtitleUrl = recordingSaved && subtitleSaved
      ? `/recordings/${project.id}/${runId}/${subtitleVttFilename}`
      : undefined;
    const run = {
      id: runId,
      projectId: project.id,
      scenarioId: scenario.id,
      status: runError ? "failed" : "passed",
      videoUrl: recordingUrl,
      mp4Url: recordingUrl,
      subtitleUrl,
      screenshotUrl: screenshotPath ? `/recordings/${project.id}/${runId}/${sanitizeFilename(scenario.name)}.png` : undefined,
      viewport,
      deviceScaleFactor,
      outputQuality: outputQuality.value,
      error: runError?.message,
      finishedAt: new Date().toISOString()
    };
    await writeFile(join(runDir, "run.json"), JSON.stringify(run, null, 2));

    if (runError) {
      const error = new Error(runError.message);
      error.run = run;
      throw error;
    }

    return { project, scenario, projects: visibleProjects(projects), run };
  })();

  try {
    currentRunControl = control;
    return await currentRun;
  } finally {
    currentRun = null;
    currentRunControl = null;
  }
}

async function cancelRun() {
  if (!currentRunControl) {
    return {
      cancelled: false,
      message: "No recording is running."
    };
  }

  currentRunControl.cancelRequested = true;
  await currentRunControl.recorder?.abort();
  await currentRunControl.context?.close().catch(() => {});
  await currentRunControl.browser?.close().catch(() => {});

  return {
    cancelled: true,
    message: "Recording cancelled."
  };
}

async function serveRecording(res, url) {
  const recordingPath = url.pathname.replace(/^\/recordings\/?/, "");
  if (!recordingPath || recordingPath.includes("..")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const filePath = join(projectsDir, recordingPath);
  try {
    await stat(filePath);
  } catch {
    res.writeHead(404);
    res.end();
    return;
  }

  const contentType = filePath.endsWith(".webm")
    ? "video/webm"
    : filePath.endsWith(".mp4")
      ? "video/mp4"
      : filePath.endsWith(".png")
        ? "image/png"
        : filePath.endsWith(".vtt")
          ? "text/vtt; charset=utf-8"
        : filePath.endsWith(".json")
          ? "application/json"
          : "application/octet-stream";

  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": contentType
  });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(body));
}

function serveLivePreview(res) {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; connect-src 'self'; img-src data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    "Content-Type": "text/html; charset=utf-8"
  });
  res.end(livePreviewHtml);
}

async function serveEmitInteractions(res) {
  const source = await readFile(emitInteractionsPath, "utf8");
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "text/javascript; charset=utf-8"
  });
  res.end(source);
}

function streamLivePreview(req, res) {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream"
  });
  res.flushHeaders?.();
  livePreviewClients.add(res);

  if (livePreviewFrame) writeLivePreviewEvent(res, "frame", livePreviewFrame);
  else writeLivePreviewEvent(res, "waiting");
  if (livePreviewAction) writeLivePreviewEvent(res, "action", JSON.stringify(livePreviewAction));

  req.on("close", () => {
    livePreviewClients.delete(res);
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const api = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${host}:${apiPort}`);

  try {
    if (req.method === "GET" && url.pathname === "/projects") {
      const state = await readProjectState();
      sendJson(res, 200, {
        projects: visibleProjects(state.projects),
        preferences: getPreferredSelection(state.projects, state.preferences)
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/system/playwright") {
      sendJson(res, 200, { playwright: await checkPlaywrightInstall() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/runs") {
      const projectId = url.searchParams.get("projectId");
      const scenarioId = url.searchParams.get("scenarioId");
      if (!projectId) throw new Error("Project is required.");
      sendJson(res, 200, { runs: await listRuns(projectId, scenarioId) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/runs/live") {
      serveLivePreview(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/runs/live/events") {
      streamLivePreview(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/emit-interactions.js") {
      await serveEmitInteractions(res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/projects") {
      const { project } = await readBody(req);
      if (!project?.name?.trim()) throw new Error("Project name is required.");
      sendJson(res, 200, await saveProject(project));
      return;
    }

    if (req.method === "POST" && url.pathname === "/projects/remove") {
      const { projectId } = await readBody(req);
      if (!projectId) throw new Error("Project is required.");
      sendJson(res, 200, await removeProject(projectId));
      return;
    }

    if (req.method === "POST" && url.pathname === "/scenarios") {
      const { projectId, scenario } = await readBody(req);
      if (!projectId) throw new Error("Project is required.");
      if (!scenario?.name?.trim()) throw new Error("Scenario name is required.");
      sendJson(res, 200, await saveScenario(projectId, scenario));
      return;
    }

    if (req.method === "POST" && url.pathname === "/scenarios/remove") {
      const { projectId, scenarioId } = await readBody(req);
      if (!projectId) throw new Error("Project is required.");
      if (!scenarioId) throw new Error("Scenario is required.");
      sendJson(res, 200, await removeScenario(projectId, scenarioId));
      return;
    }

    if (req.method === "POST" && url.pathname === "/preferences") {
      const { preferences } = await readBody(req);
      sendJson(res, 200, await savePreferences(preferences));
      return;
    }

    if (req.method === "POST" && url.pathname === "/runs") {
      const { projectId, scenarioId } = await readBody(req);
      if (!projectId) throw new Error("Project is required.");
      if (!scenarioId) throw new Error("Scenario is required.");
      sendJson(res, 200, await runScenario(projectId, scenarioId));
      return;
    }

    if (req.method === "POST" && url.pathname === "/runs/cancel") {
      sendJson(res, 200, await cancelRun());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/recordings/")) {
      await serveRecording(res, url);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: error.message, run: error.run });
  }
});

api.listen(apiPort, host, () => {
  console.log(`Replay Pilot API: http://${host}:${apiPort}`);
});

const ui = spawn(npmCommand, ["run", "dev", "--", "--host", host, "--port", String(uiPort), "--strictPort"], {
  cwd: rootDir,
  stdio: "inherit"
});

console.log(`Replay Pilot UI: http://${host}:${uiPort}`);

function shutdown() {
  ui.kill("SIGTERM");
  api.close();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
