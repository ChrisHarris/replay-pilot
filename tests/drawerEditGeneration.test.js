import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("regenerates the Playwright script when Text instructions blur and on Save", async () => {
  const source = await readFile(new URL("../src/components/Drawer_Edit.jsx", import.meta.url), "utf8");

  assert.match(source, /addEventListener\("blur", handleInstructionsBlur\)/);
  assert.doesNotMatch(source, /wa-tab-show/);
  assert.match(source, /function handleSave\(\) \{\s*const generated = regenerateScript\(\)/);
  assert.match(source, /script: generated\.script/);
  assert.match(source, /className="playwright-script"[\s\S]*?disabled[\s\S]*?><\/wa-textarea>/);
});

test("starts new scenarios with empty Text instructions", async () => {
  const source = await readFile(new URL("../src/components/Drawer_Edit.jsx", import.meta.url), "utf8");

  assert.match(source, /instructionsRef\.current\.value = scenario\?\.instructions \|\| ""/);
  assert.match(source, /normaliseInstructionIndentation\(\s*getControlValue\(instructionsRef\.current\)\s*\)/);
});
