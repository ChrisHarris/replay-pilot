import test from "node:test";
import assert from "node:assert/strict";
import { instructionsToPlaywrightScript } from "../src/lib/instructionScript.js";

test("converts nested captured instructions into scoped Playwright", () => {
  const instructions = [
    "- Open App",
    "- Tap Button: Set up Business Cash Flow",
    "- Drawer Open: Set up Business Cash Flow",
    "\t- Tap Textbox: Your name",
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
    "\t\t- Enter: 000001"
  ].join("\n");

  const script = instructionsToPlaywrightScript(instructions);

  assert.match(script, /page\.goto\(project\.url/);
  assert.match(script, /await helpers\.step\(0, "Open App"\);/);
  assert.match(script, /await helpers\.step\(1, "Tap Button: Set up Business Cash Flow"\);\nawait page\.getByRole/);
  assert.match(script, /await helpers\.step\(4, "Enter: Alex Smith"\);\nawait drawer1\.locator/);
  assert.match(script, /page\.getByRole\("button", \{ name: "Set up Business Cash Flow", exact: true \}\)\.click/);
  assert.match(script, /const drawer1 = page\.locator\("wa-drawer\[label=\\\"Set up Business Cash Flow\\\"\]\[open\]"\)/);
  assert.match(script, /drawer1\.waitFor\(\{ state: "attached" \}\)/);
  assert.match(script, /drawer1\.locator\("wa-input\[label=\\\"Your name\\\"\], wa-textarea\[label=\\\"Your name\\\"\]"\)\.getByRole\("textbox"\)\.or\(drawer1\.getByRole\("textbox", \{ name: "Your name", exact: false \}\)\)/);
  assert.match(script, /if \(\(await drawer1\.getByRole\("checkbox", \{ name: "I agree", exact: false \}\)\.isChecked\(\)\) !== true\)/);
  assert.match(script, /const webAwesomeCheckbox = drawer1\.locator\("wa-checkbox"\)\.filter\(\{ hasText: "I agree" \}\)/);
  assert.match(script, /webAwesomeCheckbox\.evaluate\(\(checkbox\) => checkbox\.click\(\)\)/);
  assert.match(script, /else await drawer1\.getByRole\("checkbox".*\.check\(\)/);
  assert.match(script, /const drawer2 = page\.locator\("wa-drawer\[label=\\\"Terms & Conditions\\\"\]\[open\]"\)/);
  assert.match(script, /drawer2\.waitFor\(\{ state: "hidden" \}\)/);
  assert.match(script, /drawer1\.getByRole\("button", \{ name: "Continue", exact: true \}\)\.click/);
  assert.match(script, /getByText\("Confirmation Code", \{ exact: true \}\).*waitFor\(\{ state: "visible" \}\)/);
  assert.match(script, /fill\("000001"\)/);
  assert.match(script, /^const defaultStepWaitMs = 750;\nconst transitionWaitMs = 2000;/);
  assert.equal((script.match(/waitForTimeout\(transitionWaitMs\)/g) || []).length, 4);
  assert.equal((script.match(/waitForTimeout\(defaultStepWaitMs\)/g) || []).length, 11);
  assert.equal((script.match(/helpers\.step\(/g) || []).length, 15);
});

test("opens the recorded URL and waits for one concise page witness", () => {
  const script = instructionsToPlaywrightScript([
    "- Open URL: http://localhost:5173/?qr=demo-ticket#demo",
    "- Page Open: Cash Flow"
  ].join("\n"));

  assert.match(script, /page\.goto\("http:\/\/localhost:5173\/\?qr=demo-ticket#demo"/);
  assert.match(script, /locator\("\[data-emit-interactions-page=\\\"Cash Flow\\\"\]"\)/);
  assert.match(script, /getByText\("Cash Flow", \{ exact: true \}\)/);
  assert.match(script, /getByLabel\("Cash Flow", \{ exact: false \}\)/);
  assert.match(script, /first\(\)\.waitFor\(\{ state: "visible" \}\)/);
});

test("waits for labelled Web Awesome dialogs and scopes their actions", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App",
    "- Dialog Open: Simulate Creating Passkey",
    "\t- Tap Button: Pass Authentication",
    "- Tap Button: Continue"
  ].join("\n"));

  assert.match(script, /const dialog1 = page\.locator\("wa-dialog\[label=\\\"Simulate Creating Passkey\\\"\]\[open\]"\)/);
  assert.match(script, /dialog1\.waitFor\(\{ state: "attached" \}\)/);
  assert.match(script, /dialog1\.getByRole\("button", \{ name: "Pass Authentication", exact: true \}\)\.click\(\)/);
  assert.match(script, /dialog1\.waitFor\(\{ state: "hidden" \}\)/);
  assert.match(script, /dialog1\.waitFor\(\{ state: "hidden" \}\);\nawait page\.waitForTimeout\(transitionWaitMs\);\nawait helpers\.step\(3, "Tap Button: Continue"\);\nawait page\.getByRole/);
  assert.equal((script.match(/waitForTimeout\(transitionWaitMs\)/g) || []).length, 2);
});

test("returns to page scope when instruction nesting leaves a closed drawer", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App",
    "- Drawer Open: Set up Business Cash Flow",
    "\t- Tap Button: Finish",
    "- Tap Button: Edit profile",
    "- Drawer Open: Edit Profile",
    "\t- Page Open: Profile Details"
  ].join("\n"));

  assert.match(script, /drawer1\.getByRole\("button", \{ name: "Finish", exact: true \}\)\.click\(\)/);
  assert.match(script, /drawer1\.waitFor\(\{ state: "hidden" \}\);\nawait page\.waitForTimeout\(transitionWaitMs\);\nawait helpers\.step\(3, "Tap Button: Edit profile"\);\nawait page\.getByRole/);
  assert.doesNotMatch(script, /drawer1\.getByRole\("button", \{ name: "Edit profile"/);
  assert.doesNotMatch(script, /drawer2\.waitFor\(\{ state: "hidden" \}\)/);
});

test("escapes drawer labels inside exact Web Awesome attribute selectors", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App",
    '- Drawer Open: Customer "Details"'
  ].join("\n"));

  assert.ok(script.includes(String.raw`const drawer1 = page.locator("wa-drawer[label=\"Customer \\\"Details\\\"\"][open]");`));
});

test("uses reflected Web Awesome labels with native role fallbacks for form fields", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App",
    "- Tap Textbox: Required name",
    "\t- Enter: Chris",
    "- Tap Number Input: Age",
    "- Tap Select: Country"
  ].join("\n"));

  assert.match(script, /page\.locator\("wa-input\[label=\\\"Required name\\\"\], wa-textarea\[label=\\\"Required name\\\"\]"\)\.getByRole\("textbox"\)\.or\(page\.getByRole\("textbox", \{ name: "Required name", exact: false \}\)\)/);
  assert.match(script, /page\.locator\("wa-number-input\[label=\\\"Age\\\"\]"\)\.getByRole\("spinbutton"\)/);
  assert.match(script, /page\.locator\("wa-select\[label=\\\"Country\\\"\]"\)\.getByRole\("combobox"\)/);
});

test("generates uncheck, select, key press, and redacted-value instructions", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App",
    "- Tap Checkbox: Updates",
    "\t- Checked: false",
    "- Tap Select: Country",
    "\t- Select: gb",
    "- Tap Textbox: Search",
    "\t- Press: Enter",
    "- Tap Textbox: Password",
    "\t- Enter: [redacted]"
  ].join("\n"));

  assert.match(script, /isChecked\(\)\) !== false/);
  assert.match(script, /else await page\.getByRole\("checkbox".*\.uncheck\(\)/);
  assert.match(script, /getByRole\("combobox".*\.selectOption\("gb"\)/);
  assert.match(script, /getByRole\("textbox".*\.press\("Enter"\)/);
  assert.match(script, /Enter a sensitive value/);
});

test("supports existing instructions nested beneath Open App", () => {
  const script = instructionsToPlaywrightScript([
    "- Open App:",
    "\t- Wait 2 seconds",
    "\t- Tap Input: Email",
    "\t\t- Enter: user@example.com",
    "\t- Wait for Account Drawer"
  ].join("\n"));

  assert.match(script, /page\.goto\(project\.url/);
  assert.match(script, /waitForTimeout\(2000\)/);
  assert.match(script, /\.or\(page\.getByRole\("textbox", \{ name: "Email", exact: false \}\)\)\.click/);
  assert.match(script, /fill\("user@example\.com"\)/);
  assert.match(script, /Wait for Account Drawer/);
});
