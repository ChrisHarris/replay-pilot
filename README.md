# Replay Pilot

Replay Pilot is a local Web Awesome/React app for managing projects, editing scenario instructions, and recording Chromium scenarios controlled by Playwright.

## Setup

Install dependencies:

```bash
npm install
```

Install the Chromium binary used for scenario recording. The FFmpeg H.264 encoder is installed by `npm install`.

```bash
npm run setup:browsers
```

Start Replay Pilot:

```bash
npm run runner
```

The runner starts the local API and the Vite app. If the recording tools are missing, Replay Pilot will show setup instructions in the app.

Each project's settings drawer controls its capture-frame quality: JPEG at quality 50, 75, 90, or 100, or lossless PNG. Recordings are encoded as H.264 MP4 at CRF 18; PNG frame capture can use more CPU than JPEG on demanding pages.

## Emit interactions

Add the Emit Interactions bridge to the base HTML of a tested app:

```html
<script defer src="http://127.0.0.1:4578/emit-interactions.js"></script>
```

The bridge is dormant until the Record button enables interaction emission and pauses when the button is pressed again. It emits clicked controls, committed field values, checked states, selections, and action keys, but does not collect pointer movement. Text values are buffered until the field loses focus, another control is clicked, the containing view changes, or Pause is pressed, so only the final value is emitted.

Replay Pilot logs each received interaction and converts the session into nested markdown instructions live in the scenario description. Drawer scopes and field values become indentation levels. After the bridge acknowledges Pause, Replay Pilot replaces that scenario's `instructions` block in `Projects/projects.md`.

After Pause, Replay Pilot also parses the completed instructions into a scoped Playwright script and replaces the scenario's `script` block. Drawer presentation and dismissal waits use visible/hidden dialog locators followed by a two-second pause; React page-presentation instructions add the same two-second pause. Leaving the Text instructions field in the edit drawer or saving the scenario regenerates the script from the latest instructions.

Password fields and controls marked with `data-emit-interactions-redact` are emitted without their values. An element and its descendants can be excluded with `data-emit-interactions-ignore`.

When emission starts, the bridge emits one concise visible page witness so instructions begin with `Open URL: …` and `Page Open: …`. It prefers `data-emit-interactions-page`, then a heading, then the first labelled field or control. An explicit page marker is authoritative, and transient Web Awesome skeleton states are ignored. Completed Web Awesome drawer transitions emit `presented` and `dismissed` component-state interactions. While a drawer is open, the bridge also detects React replacing its body with a structurally different page and emits `page-presented`; `data-emit-interactions-page="Verify Phone Number"` can provide an explicit stable identity when needed.

## Subtitle tracks

During a run, the selected instruction-tree label is automatically kept in sync with the encoded frame clock and embedded in the MP4 as a timed subtitle. Each label remains visible until the next instruction becomes active.

Scenario scripts can override the current timed caption with a reserved console message or helper:

```js
console.log("@replay:caption Open the sign-up form");
await page.getByRole("button", { name: "Sign up" }).click();

helpers.caption("Enter your name");
await page.getByLabel("Your name").fill("Janet Denbeigh");
```

Each custom caption remains active until the next instruction or caption message. Emit `console.log("@replay:caption")` or `helpers.caption("")` to clear it. Captions are embedded as a selectable MP4 subtitle track without burning text into the video or re-encoding the video stream.

The Recordings drawer can show or hide subtitles for every captioned video. This playback preference is saved in the `User Preferences` block of `Projects/projects.md` and is retained when the drawer or app is reopened.

## Build versions

Update `release-notes.md` before building. Use ordinal long-form date headings such as `26th March 2026` and full `yyyy.mm.dd.n` build headings. `npm run build` verifies the next release-note entry, then increments the tracked build number in `src/buildVersion.js`. The daily sequence starts at `1` and increments for every build.
