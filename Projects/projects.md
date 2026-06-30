# Replay Pilot Projects

## User Preferences
- project: customer-web-app
- scenario: record-test
- subtitles: off

## Project: Customer Web App
- id: customer-web-app
- icon: circle-user
- url: http://localhost:5173/?qr=demo-ticket#demo
- capture:
  - width: 402
  - height: 867
  - resolution: 2
  - output-quality: jpeg-75

### Scenario: Smoke Test
- id: smoke-test
```instructions
- Open App
	- Wait 2 seconds
	- Tap Button: Set Up Business Cash Flow
	- Wait for Set Up Business Cash Flow Popup
		- Tap Input: What would you like us to call you?
			- Enter: Janet Denbiegh
		- Tap Input: Your UK mobile number
			- Enter: 07712671137
		- Tap Link: Terms & Conditions
			- Wait for Terms & Conditions Popup
			- Scroll down 200px
			- Scroll up 200px
			- Tap Button: Close
		- Tap Button: Continue
```
```script
await page.goto(project.url, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "Set up Business Cash Flow" }).click();

await page.waitForTimeout(2000);

const preferredNameInput = setupDialog.getByLabel("What would you like us to call you?");
await preferredNameInput.click();
await preferredNameInput.fill("Janet Denbiegh");

const mobileNumberInput = setupDialog.getByLabel("Your UK mobile number");
await mobileNumberInput.click();
await mobileNumberInput.fill("07712671137");

await setupDialog.getByRole("link", { name: "Terms & Conditions" }).click();

const termsDialog = page.getByRole("dialog", { name: "Terms & Conditions" });
await termsDialog.waitFor({ state: "visible" });
await page.mouse.wheel(0, 200);
await page.mouse.wheel(0, -200);
await termsDialog.getByRole("button", { name: "Close" }).click();
await termsDialog.waitFor({ state: "hidden" });

await setupDialog.getByRole("button", { name: "Continue" }).click();
```

### Scenario: Front Page Test
- id: smoke-test-2
```instructions
- Open URL: http://localhost:5173/?qr=demo-ticket#demo
- Page Open: Choose language
- Tap Button: Let's get you logged on
- Drawer Open: Let's get you logged on
	- Page Open: Your UK mobile phone number
	- Tap Textbox: Your UK mobile phone number
		- Enter: +447712671137
	- Tap Button: Continue with Passkey
	- Dialog Open: Simulate Passkey Challenge
		- Tap Button: Pass Authentication
	- Drawer Closed: Let's get you logged on
```
```script
const defaultStepWaitMs = 750;
const transitionWaitMs = 2000;
await helpers.step(0, "Open URL: http://localhost:5173/?qr=demo-ticket#demo");
await page.goto("http://localhost:5173/?qr=demo-ticket#demo", { waitUntil: "networkidle" });
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(1, "Page Open: Choose language");
await page.locator("[data-emit-interactions-page=\"Choose language\"]").or(page.getByText("Choose language", { exact: true })).or(page.getByLabel("Choose language", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(2, "Tap Button: Let's get you logged on");
await page.getByRole("button", { name: "Let's get you logged on", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(3, "Drawer Open: Let's get you logged on");
const drawer1 = page.locator("wa-drawer[label=\"Let's get you logged on\"][open]");
await drawer1.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(4, "Page Open: Your UK mobile phone number");
await drawer1.locator("[data-emit-interactions-page=\"Your UK mobile phone number\"]").or(drawer1.getByText("Your UK mobile phone number", { exact: true })).or(drawer1.getByLabel("Your UK mobile phone number", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(5, "Tap Textbox: Your UK mobile phone number");
await drawer1.locator("wa-input[label=\"Your UK mobile phone number\"], wa-textarea[label=\"Your UK mobile phone number\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Your UK mobile phone number", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(6, "Enter: +447712671137");
await drawer1.locator("wa-input[label=\"Your UK mobile phone number\"], wa-textarea[label=\"Your UK mobile phone number\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Your UK mobile phone number", exact: false })).fill("+447712671137");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(7, "Tap Button: Continue with Passkey");
await drawer1.getByRole("button", { name: "Continue with Passkey", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(8, "Dialog Open: Simulate Passkey Challenge");
const dialog2 = page.locator("wa-dialog[label=\"Simulate Passkey Challenge\"][open]");
await dialog2.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(9, "Tap Button: Pass Authentication");
await dialog2.getByRole("button", { name: "Pass Authentication", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await dialog2.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(10, "Drawer Closed: Let's get you logged on");
await drawer1.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
```

### Scenario: Onboarding Flow
- id: record-test
```instructions
- Open URL: http://localhost:5173/?qr=demo-ticket#demo
- Page Open: Set up Business Cash Flow
- Tap Button: Set up Business Cash Flow
- Drawer Open: Set up Business Cash Flow
	- Page Open: Sign Up Details
	- Tap Textbox: What would you like us to call you?
		- Enter: Chris
	- Tap Textbox: Your UK mobile number
		- Enter: 07712671337
	- Tap Checkbox: I agree to Terms & Conditions
		- Checked: true
	- Tap Button: Continue
	- Page Open: Verify Phone Number
	- Tap Textbox: Confirmation code
		- Enter: 000001
	- Tap Button: Resend Code
	- Tap Textbox: Confirmation code
		- Enter: 000006
	- Tap Button: Sign up with passkey
	- Dialog Open: Simulate Creating Passkey
		- Tap Button: Pass Authentication
- Tap Button: Edit profile
- Drawer Open: Edit Profile
	- Page Open: What would you like us to call you?
```
```script
const defaultStepWaitMs = 750;
const transitionWaitMs = 2000;
await helpers.step(0, "Open URL: http://localhost:5173/?qr=demo-ticket#demo");
await page.goto("http://localhost:5173/?qr=demo-ticket#demo", { waitUntil: "networkidle" });
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(1, "Page Open: Set up Business Cash Flow");
await page.locator("[data-emit-interactions-page=\"Set up Business Cash Flow\"]").or(page.getByText("Set up Business Cash Flow", { exact: true })).or(page.getByLabel("Set up Business Cash Flow", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(2, "Tap Button: Set up Business Cash Flow");
await page.getByRole("button", { name: "Set up Business Cash Flow", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(3, "Drawer Open: Set up Business Cash Flow");
const drawer1 = page.locator("wa-drawer[label=\"Set up Business Cash Flow\"][open]");
await drawer1.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(4, "Page Open: Sign Up Details");
await drawer1.locator("[data-emit-interactions-page=\"Sign Up Details\"]").or(drawer1.getByText("Sign Up Details", { exact: true })).or(drawer1.getByLabel("Sign Up Details", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(5, "Tap Textbox: What would you like us to call you?");
await drawer1.locator("wa-input[label=\"What would you like us to call you?\"], wa-textarea[label=\"What would you like us to call you?\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "What would you like us to call you?", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(6, "Enter: Chris");
await drawer1.locator("wa-input[label=\"What would you like us to call you?\"], wa-textarea[label=\"What would you like us to call you?\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "What would you like us to call you?", exact: false })).fill("Chris");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(7, "Tap Textbox: Your UK mobile number");
await drawer1.locator("wa-input[label=\"Your UK mobile number\"], wa-textarea[label=\"Your UK mobile number\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Your UK mobile number", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(8, "Enter: 07712671337");
await drawer1.locator("wa-input[label=\"Your UK mobile number\"], wa-textarea[label=\"Your UK mobile number\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Your UK mobile number", exact: false })).fill("07712671337");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(9, "Tap Checkbox: I agree to Terms & Conditions");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(10, "Checked: true");
if ((await drawer1.getByRole("checkbox", { name: "I agree to Terms & Conditions", exact: false }).isChecked()) !== true) {
  const webAwesomeCheckbox = drawer1.locator("wa-checkbox").filter({ hasText: "I agree to Terms & Conditions" });
  if (await webAwesomeCheckbox.count()) await webAwesomeCheckbox.evaluate((checkbox) => checkbox.click());
  else await drawer1.getByRole("checkbox", { name: "I agree to Terms & Conditions", exact: false }).check();
}
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(11, "Tap Button: Continue");
await drawer1.getByRole("button", { name: "Continue", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(12, "Page Open: Verify Phone Number");
await drawer1.locator("[data-emit-interactions-page=\"Verify Phone Number\"]").or(drawer1.getByText("Verify Phone Number", { exact: true })).or(drawer1.getByLabel("Verify Phone Number", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(13, "Tap Textbox: Confirmation code");
await drawer1.locator("wa-input[label=\"Confirmation code\"], wa-textarea[label=\"Confirmation code\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Confirmation code", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(14, "Enter: 000001");
await drawer1.locator("wa-input[label=\"Confirmation code\"], wa-textarea[label=\"Confirmation code\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Confirmation code", exact: false })).fill("000001");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(15, "Tap Button: Resend Code");
await drawer1.getByRole("button", { name: "Resend Code", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(16, "Tap Textbox: Confirmation code");
await drawer1.locator("wa-input[label=\"Confirmation code\"], wa-textarea[label=\"Confirmation code\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Confirmation code", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(17, "Enter: 000006");
await drawer1.locator("wa-input[label=\"Confirmation code\"], wa-textarea[label=\"Confirmation code\"]").getByRole("textbox").or(drawer1.getByRole("textbox", { name: "Confirmation code", exact: false })).fill("000006");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(18, "Tap Button: Sign up with passkey");
await drawer1.getByRole("button", { name: "Sign up with passkey", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(19, "Dialog Open: Simulate Creating Passkey");
const dialog2 = page.locator("wa-dialog[label=\"Simulate Creating Passkey\"][open]");
await dialog2.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(20, "Tap Button: Pass Authentication");
await dialog2.getByRole("button", { name: "Pass Authentication", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await dialog2.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
await drawer1.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(21, "Tap Button: Edit profile");
await page.getByRole("button", { name: "Edit profile", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(22, "Drawer Open: Edit Profile");
const drawer3 = page.locator("wa-drawer[label=\"Edit Profile\"][open]");
await drawer3.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(23, "Page Open: What would you like us to call you?");
await drawer3.locator("[data-emit-interactions-page=\"What would you like us to call you?\"]").or(drawer3.getByText("What would you like us to call you?", { exact: true })).or(drawer3.getByLabel("What would you like us to call you?", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
```

### Scenario: Log on
- id: log-on
```instructions
- Open URL: http://localhost:5173/?qr=demo-ticket#demo
- Page Open: Choose language
- Tap Button: Set up Business Cash Flow
- Drawer Open: Set up Business Cash Flow
	- Page Open: Sign Up Details
	- Tap Button: Cancel
- Drawer Closed: Set up Business Cash Flow
- Tap Button: Let's get you logged on
- Drawer Open: Let's get you logged on
	- Page Open: Your UK mobile phone number
	- Tap Textbox: Your UK mobile phone number
		- Enter: +447712671137
	- Tap Button: Continue with Passkey
	- Dialog Open: Simulate Passkey Challenge
		- Tap Button: Pass Authentication
	- Drawer Closed: Let's get you logged on
```
```script
const defaultStepWaitMs = 750;
const transitionWaitMs = 2000;
await helpers.step(0, "Open URL: http://localhost:5173/?qr=demo-ticket#demo");
await page.goto("http://localhost:5173/?qr=demo-ticket#demo", { waitUntil: "networkidle" });
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(1, "Page Open: Choose language");
await page.locator("[data-emit-interactions-page=\"Choose language\"]").or(page.getByText("Choose language", { exact: true })).or(page.getByLabel("Choose language", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(2, "Tap Button: Set up Business Cash Flow");
await page.getByRole("button", { name: "Set up Business Cash Flow", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(3, "Drawer Open: Set up Business Cash Flow");
const drawer1 = page.locator("wa-drawer[label=\"Set up Business Cash Flow\"][open]");
await drawer1.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(4, "Page Open: Sign Up Details");
await drawer1.locator("[data-emit-interactions-page=\"Sign Up Details\"]").or(drawer1.getByText("Sign Up Details", { exact: true })).or(drawer1.getByLabel("Sign Up Details", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(5, "Tap Button: Cancel");
await drawer1.getByRole("button", { name: "Cancel", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(6, "Drawer Closed: Set up Business Cash Flow");
await drawer1.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(7, "Tap Button: Let's get you logged on");
await page.getByRole("button", { name: "Let's get you logged on", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(8, "Drawer Open: Let's get you logged on");
const drawer2 = page.locator("wa-drawer[label=\"Let's get you logged on\"][open]");
await drawer2.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(9, "Page Open: Your UK mobile phone number");
await drawer2.locator("[data-emit-interactions-page=\"Your UK mobile phone number\"]").or(drawer2.getByText("Your UK mobile phone number", { exact: true })).or(drawer2.getByLabel("Your UK mobile phone number", { exact: false })).first().waitFor({ state: "visible" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(10, "Tap Textbox: Your UK mobile phone number");
await drawer2.locator("wa-input[label=\"Your UK mobile phone number\"], wa-textarea[label=\"Your UK mobile phone number\"]").getByRole("textbox").or(drawer2.getByRole("textbox", { name: "Your UK mobile phone number", exact: false })).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(11, "Enter: +447712671137");
await drawer2.locator("wa-input[label=\"Your UK mobile phone number\"], wa-textarea[label=\"Your UK mobile phone number\"]").getByRole("textbox").or(drawer2.getByRole("textbox", { name: "Your UK mobile phone number", exact: false })).fill("+447712671137");
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(12, "Tap Button: Continue with Passkey");
await drawer2.getByRole("button", { name: "Continue with Passkey", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await helpers.step(13, "Dialog Open: Simulate Passkey Challenge");
const dialog3 = page.locator("wa-dialog[label=\"Simulate Passkey Challenge\"][open]");
await dialog3.waitFor({ state: "attached" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(14, "Tap Button: Pass Authentication");
await dialog3.getByRole("button", { name: "Pass Authentication", exact: true }).click();
await page.waitForTimeout(defaultStepWaitMs);
await dialog3.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
await helpers.step(15, "Drawer Closed: Let's get you logged on");
await drawer2.waitFor({ state: "hidden" });
await page.waitForTimeout(transitionWaitMs);
```

## Project: Ubiqular Mobile **Removed**
- id: ubiqular-mobile
- icon: folder
- url: http://localhost:5173
- capture:
  - width: 402
  - height: 867
  - resolution: 2
  - output-quality: jpeg-75

### Scenario: Smoke Test
- id: smoke-test
```instructions
- Open App:
	- Wait 5 seconds
- hgfhgf
```
```script
await page.goto(project.url, { waitUntil: "networkidle" });
await page.waitForTimeout(5000);
```
