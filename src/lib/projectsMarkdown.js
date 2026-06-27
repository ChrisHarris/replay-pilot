import { defaultCapture } from "./projectDefaults.js";

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
  if (!block) return { projectId: "", scenarioId: "" };

  const lines = block.split("\n");
  return {
    projectId: valueFrom(lines, "project", ""),
    scenarioId: valueFrom(lines, "scenario", "")
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
      resolution: Number(valueFrom(lines, "resolution", defaultCapture.resolution))
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

export function serializeProjects(projects, preferences = {}) {
  const lines = ["# Replay Pilot Projects", ""];
  const projectId = preferences.projectId || preferences.project || "";
  const scenarioId = preferences.scenarioId || preferences.scenario || "";

  lines.push("## User Preferences");
  lines.push(`- project: ${projectId}`);
  lines.push(`- scenario: ${scenarioId}`);
  lines.push("");

  for (const project of projects) {
    lines.push(`## Project: ${project.name}${project.removed ? " **Removed**" : ""}`);
    lines.push(`- id: ${project.id}`);
    lines.push(`- icon: ${project.icon || "mobile-alt"}`);
    lines.push(`- url: ${project.url || "http://localhost:5173"}`);
    lines.push("- capture:");
    lines.push(`  - width: ${Number(project.capture?.width || defaultCapture.width)}`);
    lines.push(`  - height: ${Number(project.capture?.height || defaultCapture.height)}`);
    lines.push(`  - resolution: ${Number(project.capture?.resolution || defaultCapture.resolution)}`);
    lines.push("");

    for (const scenario of project.scenarios || []) {
      lines.push(`### Scenario: ${scenario.name}`);
      lines.push(`- id: ${scenario.id}`);
      lines.push("```instructions");
      lines.push((scenario.instructions || "").trimEnd());
      lines.push("```");
      if (scenario.script) {
        lines.push("```script");
        lines.push(scenario.script.trimEnd());
        lines.push("```");
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
