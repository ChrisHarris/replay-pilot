import test from "node:test";
import assert from "node:assert/strict";
import {
  interactionsToInstructions,
  updateCapturedInteractions
} from "../src/lib/interactionInstructions.js";

const target = (role, name, kind) => ({ role, name, kind });

test("builds nested drawer and field instructions from emitted interactions", () => {
  const interactions = [
    { eventId: "0", interactionId: "0", kind: "page-state", state: "presented", page: { name: "Cash Flow" } },
    { eventId: "1", interactionId: "1", kind: "click", target: target("button", "Set up Business Cash Flow", "Button") },
    { eventId: "2", interactionId: "2", kind: "component-state", component: "wa-drawer", state: "presented", target: target("", "Set up Business Cash Flow", "Element") },
    { eventId: "3", interactionId: "name", kind: "click", target: target("textbox", "What would you like us to call you?", "Input") },
    { eventId: "4", interactionId: "name", kind: "fill", value: "Alex Smith", target: target("textbox", "What would you like us to call you?", "Input") },
    { eventId: "5", interactionId: "agree", kind: "click", target: target("checkbox", "I agree", "Checkbox") },
    { eventId: "6", interactionId: "agree", kind: "check", checked: true, target: target("checkbox", "I agree", "Checkbox") },
    { eventId: "7", interactionId: "terms", kind: "click", target: target("link", "Terms & Conditions", "Link") },
    { eventId: "8", interactionId: "8", kind: "component-state", component: "wa-drawer", state: "presented", target: target("", "Terms & Conditions", "Element") },
    { eventId: "9", interactionId: "close", kind: "click", target: target("button", "Close", "Button") },
    { eventId: "10", interactionId: "10", kind: "component-state", component: "wa-drawer", state: "dismissed", target: target("", "Terms & Conditions", "Element") },
    { eventId: "11", interactionId: "continue", kind: "click", target: target("button", "Continue", "Button") },
    { eventId: "12", interactionId: "12", kind: "component-state", component: "wa-drawer", state: "page-presented", target: target("", "Set up Business Cash Flow", "Element"), page: { name: "Confirmation Code", fields: ["Confirmation Code"] } },
    { eventId: "13", interactionId: "code", kind: "click", target: target("textbox", "Confirmation Code", "Input") },
    { eventId: "14", interactionId: "code", kind: "fill", value: "000001", target: target("textbox", "Confirmation Code", "Input") },
    { eventId: "15", interactionId: "passkey", kind: "click", target: target("button", "Sign up with passkey", "Button") },
    { eventId: "16", interactionId: "16", kind: "component-state", component: "wa-dialog", state: "presented", target: target("", "Simulate Creating Passkey", "Element") },
    { eventId: "17", interactionId: "confirm", kind: "click", target: target("button", "Pass Authentication", "Button") },
    { eventId: "18", interactionId: "18", kind: "component-state", component: "wa-dialog", state: "dismissed", target: target("", "Simulate Creating Passkey", "Element") }
  ];

  assert.equal(interactionsToInstructions(interactions, "http://localhost:5173/?qr=demo-ticket#demo"), [
    "- Open URL: http://localhost:5173/?qr=demo-ticket#demo",
    "- Page Open: Cash Flow",
    "- Tap Button: Set up Business Cash Flow",
    "- Drawer Open: Set up Business Cash Flow",
    "\t- Tap Textbox: What would you like us to call you?",
    "\t\t- Enter: Alex Smith",
    "\t- Tap Checkbox: I agree",
    "\t\t- Checked: true",
    "\t- Tap Link: Terms & Conditions",
    "\t- Drawer Open: Terms & Conditions",
    "\t\t- Tap Button: Close",
    "\t- Drawer Closed: Terms & Conditions",
    "\t- Tap Button: Continue",
    "\t- Page Open: Confirmation Code",
    "\t- Tap Textbox: Confirmation Code",
    "\t\t- Enter: 000001",
    "\t- Tap Button: Sign up with passkey",
    "\t- Dialog Open: Simulate Creating Passkey",
    "\t\t- Tap Button: Pass Authentication"
  ].join("\n"));
});

test("keeps only the latest interaction with the same event id", () => {
  const first = updateCapturedInteractions([], { eventId: "field-fill", kind: "fill", value: "A" });
  const second = updateCapturedInteractions(first, { eventId: "field-fill", kind: "fill", value: "Alex" });

  assert.deepEqual(second, [{ eventId: "field-fill", kind: "fill", value: "Alex" }]);
});

test("adds an implicit tap for a field reached without a click", () => {
  const instructions = interactionsToInstructions([{
    eventId: "autofill",
    interactionId: "autofill",
    kind: "fill",
    value: "hello",
    target: target("textbox", "Search", "Input")
  }]);

  assert.match(instructions, /- Tap Textbox: Search\n\t- Enter: hello/);
});

test("uses a document fallback when the emitted page has no concise witness", () => {
  const instructions = interactionsToInstructions([{
    eventId: "page",
    kind: "page-state",
    state: "presented",
    page: {}
  }], "http://localhost:5173");

  assert.equal(instructions, "- Open URL: http://localhost:5173\n- Page Open: Document");
});
