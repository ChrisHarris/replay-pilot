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

## Build versions

Update `release-notes.md` before building. Use ordinal long-form date headings such as `26th March 2026` and full `yyyy.mm.dd.n` build headings. `npm run build` verifies the next release-note entry, then increments the tracked build number in `src/buildVersion.js`. The daily sequence starts at `1` and increments for every build.
