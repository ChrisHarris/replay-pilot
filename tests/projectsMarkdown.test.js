import test from "node:test";
import assert from "node:assert/strict";
import { defaultCapture, getOutputQuality } from "../src/lib/projectDefaults.js";
import {
  parseProjectsFile,
  removedScenarioFolderName,
  serializeProjects,
  serializeScenario
} from "../src/lib/projectsMarkdown.js";

const project = {
  id: "quality-test",
  name: "Quality Test",
  icon: "video",
  url: "http://localhost:5173",
  capture: { ...defaultCapture },
  scenarios: []
};

test("defaults older project markdown to JPEG quality 75", () => {
  const markdown = serializeProjects([project]).replace("  - output-quality: jpeg-75\n", "");
  const parsed = parseProjectsFile(markdown);

  assert.equal(parsed.projects[0].capture.outputQuality, "jpeg-75");
});

test("round-trips PNG output quality inside the capture block", () => {
  const markdown = serializeProjects([{
    ...project,
    capture: { ...project.capture, outputQuality: "png" }
  }]);
  const parsed = parseProjectsFile(markdown);

  assert.match(markdown, /- capture:\n(?:  - .+\n)*  - output-quality: png/);
  assert.equal(parsed.projects[0].capture.outputQuality, "png");
});

test("normalizes unsupported output quality values", () => {
  assert.equal(getOutputQuality("gif").value, "jpeg-75");
});

test("defaults subtitle playback on and round-trips the off preference", () => {
  const olderMarkdown = serializeProjects([project]).replace("- subtitles: on\n", "");
  assert.equal(parseProjectsFile(olderMarkdown).preferences.subtitles, true);

  const markdown = serializeProjects([project], {
    projectId: project.id,
    scenarioId: "",
    subtitles: false
  });
  assert.match(markdown, /## User Preferences[\s\S]*- subtitles: off/);
  assert.equal(parseProjectsFile(markdown).preferences.subtitles, false);
});

test("serializes a complete scenario for archival", () => {
  const markdown = serializeScenario({
    id: "sign-up",
    name: "Sign Up",
    instructions: "- Open URL: http://localhost:5173",
    script: "await page.goto(\"http://localhost:5173\");"
  });

  assert.equal(markdown, [
    "### Scenario: Sign Up",
    "- id: sign-up",
    "```instructions",
    "- Open URL: http://localhost:5173",
    "```",
    "```script",
    "await page.goto(\"http://localhost:5173\");",
    "```",
    ""
  ].join("\n"));
});

test("keeps the removed marker at the end of archived scenario folders", () => {
  assert.equal(removedScenarioFolderName({ id: "sign-up" }), "sign-up **Removed**");
  assert.equal(removedScenarioFolderName({ id: "sign-up" }, 2), "sign-up-2 **Removed**");
});
