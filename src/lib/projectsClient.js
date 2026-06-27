import { parseProjectsFile, visibleProjects } from "./projectsMarkdown.js";

const localProjectsUrl = "/Projects/projects.md";

function getDefaultApiUrl() {
  const uiPort = Number(window.location.port);
  if (uiPort) return `${window.location.protocol}//${window.location.hostname}:${uiPort + 1}`;
  return "http://127.0.0.1:4578";
}

function getApiUrl() {
  return localStorage.getItem("replayPilot.apiUrl") || getDefaultApiUrl();
}

export function getRecordingUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getLivePreviewUrl() {
  return `${getApiUrl()}/runs/live`;
}

async function request(path, options = {}) {
  const response = await fetch(`${getApiUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Replay Pilot API returned ${response.status}`);
    error.body = body;
    throw error;
  }
  return body;
}

export async function getProjects() {
  try {
    const body = await request("/projects");
    if (Array.isArray(body.projects) && body.projects.length > 0) return body;

    const localBody = await loadLocalProjects();
    if (localBody.projects?.length) return localBody;
    if (Array.isArray(body.projects)) return body;
  } catch {
    // Fall back to the local markdown file when the API is not running.
  }

  return loadLocalProjects();
}

async function loadLocalProjects() {
  const response = await fetch(localProjectsUrl, { cache: "no-store" });
  if (!response.ok) return { projects: [] };

  const markdown = await response.text();
  const state = parseProjectsFile(markdown);
  return {
    ...state,
    projects: visibleProjects(state.projects)
  };
}

export function saveProject(project) {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify({ project })
  });
}

export function removeProject(projectId) {
  return request("/projects/remove", {
    method: "POST",
    body: JSON.stringify({ projectId })
  });
}

export function saveScenario(projectId, scenario) {
  return request("/scenarios", {
    method: "POST",
    body: JSON.stringify({ projectId, scenario })
  });
}

export function runScenario(projectId, scenarioId) {
  return request("/runs", {
    method: "POST",
    body: JSON.stringify({ projectId, scenarioId })
  });
}

export function getRuns(projectId, scenarioId) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (scenarioId) params.set("scenarioId", scenarioId);
  return request(`/runs?${params.toString()}`);
}

export function cancelRun() {
  return request("/runs/cancel", {
    method: "POST"
  });
}

export function getPlaywrightStatus() {
  return request("/system/playwright");
}

export function savePreferences(preferences) {
  return request("/preferences", {
    method: "POST",
    body: JSON.stringify({ preferences })
  });
}
