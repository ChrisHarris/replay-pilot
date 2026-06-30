import test from "node:test";
import assert from "node:assert/strict";
import {
  getInstructionDisplayTree,
  getInstructionPresentation,
  parseInstructionTree
} from "../src/lib/instructionTree.js";

test("assigns stable preorder indexes to nested instruction tree items", () => {
  const tree = parseInstructionTree([
    "- Open URL: http://localhost:5173",
    "- Tap Textbox: Name",
    "\t- Enter: Chris",
    "- Tap Button: Continue"
  ].join("\n"));

  assert.deepEqual(
    [tree[0], tree[1], tree[1].children[0], tree[2]].map(({ text, stepIndex }) => ({ text, stepIndex })),
    [
      { text: "Open URL: http://localhost:5173", stepIndex: 0 },
      { text: "Tap Textbox: Name", stepIndex: 1 },
      { text: "Enter: Chris", stepIndex: 2 },
      { text: "Tap Button: Continue", stepIndex: 3 }
    ]
  );
});

test("maps instruction commands to tree icons", () => {
  assert.deepEqual(
    [
      "Open URL: https://example.com",
      "Page Open: Profile",
      "Tap Textbox: Name",
      "Tap Checkbox: I agree",
      "Tap Button: Continue",
      "Drawer Open: Edit Profile",
      "Dialog Open: Authenticate",
      "Run complete"
    ].map((instruction) => getInstructionPresentation(instruction, 0)),
    [
      { icon: "globe", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "file", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "input-pipe", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "square-check", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "rectangle", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "window-maximize", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "object-subtract", rotate: 90, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" },
      { icon: "stop", rotate: undefined, color: "color-mix(in oklab, var(--wa-color-text-normal) 100%, var(--wa-color-text-quiet) 0%)" }
    ]
  );
});

test("adds display-only details without changing executable instruction indexes", () => {
  const instructions = [
    "- Page Open: Cash Flow",
    "- Tap Button: Set up Business Cash Flow",
    "- Drawer Open: Set up Business Cash Flow",
    "\t- Tap Button: Close",
    "- Drawer Closed: Set up Business Cash Flow"
  ].join("\n");
  const executableTree = parseInstructionTree(instructions);
  const displayTree = getInstructionDisplayTree(instructions);

  assert.deepEqual(executableTree[0].children, []);
  assert.deepEqual(displayTree[0].children, [{
    text: "Wait For: Page load",
    stepIndex: null,
    informational: true,
    children: []
  }]);
  assert.equal(displayTree[1].children[0].text, "Action: Open Drawer");
  assert.equal(displayTree[2].children[0].children[0].text, "Action: Close Drawer");
  assert.deepEqual(
    executableTree.map(({ stepIndex }) => stepIndex),
    [0, 1, 2, 4]
  );
});

test("describes page, dialog, and fallback button actions in the display tree", () => {
  const displayTree = getInstructionDisplayTree([
    "- Open URL: https://example.com",
    "- Tap Button: Continue",
    "- Page Open: Confirmation",
    "- Tap Button: Authenticate",
    "- Dialog Open: Passkey",
    "\t- Tap Button: Confirm",
    "- Tap Button: Save"
  ].join("\n"));

  assert.equal(displayTree[0].children[0].text, "Wait For: Network idle");
  assert.equal(displayTree[1].children[0].text, "Action: Open Page");
  assert.equal(displayTree[2].children[0].text, "Wait For: Page load");
  assert.equal(displayTree[3].children[0].text, "Action: Open Dialog");
  assert.equal(displayTree[4].children[0].children[0].text, "Action: Close Dialog");
  assert.equal(displayTree[5].children[0].text, "Action: Activate Button");
});

test("keeps disclosure icons available for mapped leaf instructions", () => {
  const displayTree = getInstructionDisplayTree([
    "- Tap Textbox: Search",
    "- Tap Checkbox: Updates",
    "- Drawer Open: Filters",
    "- Dialog Open: Confirm"
  ].join("\n"));

  assert.deepEqual(
    displayTree.slice(0, -1).map((node) => node.children[0].text),
    ["Action: Focus Textbox", "Action: Toggle Checkbox", "Wait For: Drawer open", "Wait For: Dialog open"]
  );
});

test("appends a display-only run completion instruction", () => {
  const executableTree = parseInstructionTree("- Page Open: Home");
  const displayTree = getInstructionDisplayTree("- Page Open: Home");
  const completion = displayTree.at(-1);

  assert.deepEqual(completion, {
    text: "Run complete",
    stepIndex: null,
    informational: true,
    children: [{
      text: "Recording: Stop",
      stepIndex: null,
      informational: true,
      children: []
    }]
  });
  assert.equal(executableTree.length, 1);
  assert.equal(executableTree[0].stepIndex, 0);
});

test("lightens each nested instruction by twenty percent using Web Awesome text tokens", () => {
  assert.equal(
    getInstructionPresentation("Enter: Chris", 1).color,
    "color-mix(in oklab, var(--wa-color-text-normal) 80%, var(--wa-color-text-quiet) 20%)"
  );
  assert.equal(
    getInstructionPresentation("Enter: Chris", 3).color,
    "color-mix(in oklab, var(--wa-color-text-normal) 40%, var(--wa-color-text-quiet) 60%)"
  );
  assert.equal(getInstructionPresentation("Enter: Chris", 8).color.endsWith("80%)"), true);
});
