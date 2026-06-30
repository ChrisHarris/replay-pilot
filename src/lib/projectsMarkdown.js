import { defaultCapture, getOutputQuality } from "./projectDefaults.js";

export const REMOVED_FOLDER_SUFFIX = " **Removed**";

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function valueFrom(lines, key, fallback = "") {
  const line = lines.find((item) => item.trim().startsWith(`- ${key}:`));
  if (!line) return fallback;
  return line.split(":").slice(1).join(":").trim() || fallback;
}

function readInstructions(block) {
  const match = block.match(/```instructions\n([\s\S]*?)\n```/);
  return match?.[1] ?? "";
}

function readScript(block) {
  const match = block.match(/```script\n([\s\S]*?)\n```/);
  return match?.[1] ?? "";
}

function parseUserPreferences(markdown) {
  const block = markdown
    .split(/\n(?=## )/)
    .find((part) => part.startsWith("## User Preferences"));
  if (!block) return { projectId: "", scenarioId: "", subtitles: true };

  const lines = block.split("\n");
  return {
    projectId: valueFrom(lines, "project", ""),
    scenarioId: valueFrom(lines, "scenario", ""),
    subtitles: !["false", "off", "no", "0"].includes(valueFrom(lines, "subtitles", "on").toLowerCase())
  };
}

function parseScenario(block) {
  const lines = block.split("\n");
  const heading = lines.find((line) => line.startsWith("### Scenario:"));
  const name = heading?.replace("### Scenario:", "").trim() || valueFrom(lines, "name", "Untitled Scenario");

  return {
    id: valueFrom(lines, "id", slugify(name)),
    name,
    instructions: readInstructions(block),
    script: readScript(block)
  };
}

function parseProject(block) {
  const lines = block.split("\n");
  const heading = lines.find((line) => line.startsWith("## "));
  const headingText = (heading || "")
    .replace(/^##\s+/, "")
    .replace(/^Project:\s*/, "")
    .trim();
  const removed = /\s+\*\*Removed\*\*$/.test(headingText);
  const name = headingText.replace(/\s+\*\*Removed\*\*$/, "").trim() || valueFrom(lines, "name", "Untitled Project");
  const scenarioBlocks = block
    .split(/\n(?=### Scenario: )/)
    .filter((part) => part.startsWith("### Scenario:"));

  return {
    id: valueFrom(lines, "id", slugify(name)),
    name,
    removed,
    icon: valueFrom(lines, "icon", "mobile-alt"),
    url: valueFrom(lines, "url", "http://localhost:5173"),
    capture: {
      width: Number(valueFrom(lines, "width", defaultCapture.width)),
      height: Number(valueFrom(lines, "height", defaultCapture.height)),
      resolution: Number(valueFrom(lines, "resolution", defaultCapture.resolution)),
      outputQuality: getOutputQuality(valueFrom(lines, "output-quality", defaultCapture.outputQuality)).value
    },
    scenarios: scenarioBlocks.map(parseScenario)
  };
}

export function parseProjectsMarkdown(markdown) {
  return markdown
    .split(/\n(?=## )/)
    .filter((part) => part.startsWith("## ") && !part.startsWith("## User Preferences"))
    .map(parseProject);
}

export function visibleProjects(projects) {
  return projects.filter((project) => !project.removed);
}

export function parseProjectsFile(markdown) {
  return {
    preferences: parseUserPreferences(markdown),
    projects: parseProjectsMarkdown(markdown)
  };
}

export function removedScenarioFolderName(scenario, copyIndex = 1) {
  const baseName = slugify(scenario?.id || scenario?.name || "scenario");
  const copySuffix = copyIndex > 1 ? `-${copyIndex}` : "";
  return `${baseName}${copySuffix}${REMOVED_FOLDER_SUFFIX}`;
}

export function serializeScenario(scenario) {
  const lines = [
    `### Scenario: ${scenario.name}`,
    `- id: ${scenario.id}`,
    "```instructions",
    (scenario.instructions || "").trimEnd(),
    "```"
  ];

  if (scenario.script) {
    lines.push("```script");
    lines.push(scenario.script.trimEnd());
    lines.push("```");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeProjects(projects, preferences = {}) {
  const lines = ["# Replay Pilot Projects", ""];
  const projectId = preferences.projectId || preferences.project || "";
  const scenarioId = preferences.scenarioId || preferences.scenario || "";
  const subtitles = preferences.subtitles !== false;

  lines.push("## User Preferences");
  lines.push(`- project: ${projectId}`);
  lines.push(`- scenario: ${scenarioId}`);
  lines.push(`- subtitles: ${subtitles ? "on" : "off"}`);
  lines.push("");

  for (const project of projects) {
    lines.push(`## Project: ${project.name}${project.removed ? REMOVED_FOLDER_SUFFIX : ""}`);
    lines.push(`- id: ${project.id}`);
    lines.push(`- icon: ${project.icon || "mobile-alt"}`);
    lines.push(`- url: ${project.url || "http://localhost:5173"}`);
    lines.push("- capture:");
    lines.push(`  - width: ${Number(project.capture?.width || defaultCapture.width)}`);
    lines.push(`  - height: ${Number(project.capture?.height || defaultCapture.height)}`);
    lines.push(`  - resolution: ${Number(project.capture?.resolution || defaultCapture.resolution)}`);
    lines.push(`  - output-quality: ${getOutputQuality(project.capture?.outputQuality).value}`);
    lines.push("");

    for (const scenario of project.scenarios || []) {
      lines.push(serializeScenario(scenario).trimEnd());
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
