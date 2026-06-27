# Replay Pilot Projects

## User Preferences
- project: customer-web-app
- scenario: smoke-test

## Project: Customer Web App
- id: customer-web-app
- icon: circle-user
- url: http://localhost:5173
- capture:
  - width: 402
  - height: 867
  - resolution: 2

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

## Project: Ubiqular Mobile
- id: ubiqular-mobile
- icon: folder
- url: http://localhost:5173
- capture:
  - width: 402
  - height: 867
  - resolution: 2

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
