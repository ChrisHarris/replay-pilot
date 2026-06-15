const defaultRunnerUrl = "http://127.0.0.1:4578";

function getRunnerUrl() {
  return localStorage.getItem("replaypilot.runnerUrl") || defaultRunnerUrl;
}

async function request(path, options = {}) {
  const response = await fetch(`${getRunnerUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Runner returned ${response.status}`);
  return body;
}

export function getSavedRunnerUrl() {
  return getRunnerUrl();
}

export function saveRunnerUrl(url) {
  localStorage.setItem("replaypilot.runnerUrl", url || defaultRunnerUrl);
}

export function getStatus() {
  return request("/status");
}

export function startRun(settings) {
  return request("/run", {
    method: "POST",
    body: JSON.stringify(settings)
  });
}

export function cancelRun() {
  return request("/cancel", { method: "POST" });
}
