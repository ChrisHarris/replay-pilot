import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createEmitInteractionsSession,
  EMIT_INTERACTIONS_HOST_SOURCE,
  EMIT_INTERACTIONS_PROTOCOL_VERSION,
  EMIT_INTERACTIONS_SOURCE,
  isEmitInteractionsMessage
} from "../src/lib/emitInteractions.js";

test("creates an active Emit Interactions session", () => {
  const session = createEmitInteractionsSession("project-one", "scenario-one");

  assert.equal(session.state, "active");
  assert.equal(session.projectId, "project-one");
  assert.equal(session.scenarioId, "scenario-one");
  assert.equal(session.bridgeReady, false);
  assert.ok(session.sessionId);
});

test("recognizes Emit Interactions protocol messages", () => {
  assert.equal(EMIT_INTERACTIONS_HOST_SOURCE, "replay-pilot-emit-interactions-host");
  assert.equal(isEmitInteractionsMessage({
    source: EMIT_INTERACTIONS_SOURCE,
    version: EMIT_INTERACTIONS_PROTOCOL_VERSION
  }), true);
  assert.equal(isEmitInteractionsMessage({ source: "something-else", version: 1 }), false);
});

test("the browser bridge uses generalized Emit Interactions naming", async () => {
  const source = await readFile(new URL("../public/emit-interactions.js", import.meta.url), "utf8");

  assert.match(source, /source: EMITTER_SOURCE/);
  assert.match(source, /message\.type === "enable"/);
  assert.match(source, /emit\("interaction"/);
  assert.doesNotMatch(source, /replay-pilot-recorder|\brecord(?:ing|ed)?\b/i);
});

test("emits completed drawer and dialog lifecycle plus React drawer page interactions", async () => {
  const source = await readFile(new URL("../public/emit-interactions.js", import.meta.url), "utf8");
  const pageDetailsSource = source.match(/function drawerPageDetails[\s\S]*?(?=\n  function emitDrawerState)/)?.[0] || "";

  assert.match(source, /addEventListener\("wa-after-show", onComponentLifecycle, true\)/);
  assert.match(source, /addEventListener\("wa-after-hide", onComponentLifecycle, true\)/);
  assert.match(source, /\["wa-drawer", "wa-dialog"\]\.includes\(origin\?\.localName\)/);
  assert.match(source, /querySelectorAll\("wa-dialog\[open\]"\)/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /emitComponentState\(drawer, "page-presented", page\)/);
  assert.match(source, /data-emit-interactions-page/);
  assert.match(source, /kind: "page-state"/);
  assert.match(source, /\|\| fields\[0\]/);
  assert.doesNotMatch(source, /fields\.join\(" \/ "\)/);
  assert.match(source, /signature: markerName[\s\S]*?JSON\.stringify\(\["marker", markerName\]\)/);
  assert.match(source, /pending: !markerName && hasVisibleSkeleton/);
  assert.match(source, /if \(page\.pending\) return/);
  assert.doesNotMatch(pageDetailsSource, /\.value\b|valueFor/);
});

test("commits final field values and checked state at interaction boundaries", async () => {
  const source = await readFile(new URL("../public/emit-interactions.js", import.meta.url), "utf8");

  assert.match(source, /const pendingFieldInteractions = new Map\(\)/);
  assert.match(source, /pendingFieldInteractions\.set\(element/);
  assert.match(source, /kind = checkable \? "check"/);
  assert.match(source, /checked: checkedFor\(element, event\)/);
  assert.match(source, /addEventListener\("focusout", onFocusOut, true\)/);
  assert.match(source, /message\.type === "pause"[\s\S]*?flushPendingFields\(\)/);
  assert.match(source, /message\.type === "pause"[\s\S]*?if \(!emitting\) return/);
});
