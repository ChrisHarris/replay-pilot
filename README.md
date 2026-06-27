# Replay Pilot

Replay Pilot is a local Web Awesome/React app for managing projects, editing scenario instructions, and recording Playwright videos.

## Setup

Install dependencies:

```bash
npm install
```

Install the Playwright browser binaries used for scenario recording. The H.264 MP4 converter is installed by `npm install`.

```bash
npm run setup:browsers
```

Start Replay Pilot:

```bash
npm run runner
```

The runner starts the local API and the Vite app. If the recording tools are missing, Replay Pilot will show setup instructions in the app.
