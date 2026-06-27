# Build release notes

- Update `release-notes.md` before every `npm run build`.
- Add the next build under `# 26th March 2026`-style date headings and full `## yyyy.mm.dd.n` build headings, newest build first.
- Summarize the build with one to five concise, user-facing bullets.
- Keep older entries intact.
- Ensure the release-note build matches the version generated in `src/buildVersion.js`.
