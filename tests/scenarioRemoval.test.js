import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("offers confirmed scenario removal from the edit drawer", async () => {
  const source = await readFile(new URL("../src/components/Drawer_Edit.jsx", import.meta.url), "utf8");

  assert.match(source, /variant="danger"[\s\S]*?onClick=\{handleRemoveRequest\}[\s\S]*?Remove/);
  assert.match(source, /<wa-dialog[^>]+label="Are you sure\?"/);
  assert.match(source, /onRemove\?\.\(scenario\)/);
});

test("connects scenario removal to its archive endpoint", async () => {
  const clientSource = await readFile(new URL("../src/lib/projectsClient.js", import.meta.url), "utf8");
  const serverSource = await readFile(new URL("../scripts/runner-server.mjs", import.meta.url), "utf8");

  assert.match(clientSource, /removeScenario\(projectId, scenarioId\)[\s\S]*?\/scenarios\/remove/);
  assert.match(serverSource, /writeFile\(join\(archive\.path, "scenario\.md"\), serializeScenario\(scenario\)\)/);
  assert.match(serverSource, /url\.pathname === "\/scenarios\/remove"/);
});
