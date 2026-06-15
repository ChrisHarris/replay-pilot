# ReplayPilot

ReplayPilot is a standalone local automation cockpit for running browser test and release-video scenarios against apps on localhost, staging, or release-candidate URLs.

## Run Locally

```bash
npm install
npm run runner
```

The runner starts:

- UI: `http://127.0.0.1:4577`
- API: `http://127.0.0.1:4578`

Point the UI at an app such as `http://127.0.0.1:5173`, choose a scenario pack, and start a run.

## Structure

```text
src/components/Card_*.jsx      Page cards
src/components/Drawer_*.jsx    Drawer details and editing surfaces
src/data/scenarios.js          Scenario metadata
src/lib/runnerClient.js        Browser-to-runner API client
src/styles/theme.css           Single brand color variable
src/styles/app.css             Layout and component composition
scripts/runner-server.mjs      Local runner bridge
tests/scenarios/*.spec.js      Playwright scenario packs
```

The app under test stays separate. ReplayPilot only needs a URL it can open in Playwright.
