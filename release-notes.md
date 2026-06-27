# 28th June 2026

## 2026.06.28.1

- Streamed Chromium capture frames directly into smooth 30 fps MP4 recordings.
- Kept live previews at their configured capture size while scaling them to fit the workspace.
- Added the current build number and in-app release notes to the navigation footer.
- Improved recording playback layout and scenario-saving feedback.

# 27th June 2026

## 2026.06.27.8

- Shortened the edited-scenario saving notification to 1.5 seconds.

## 2026.06.27.7

- Matched the scenario-saving notification icon to the Save button without animation.

## 2026.06.27.6

- Reduced the edited-scenario saving notification to two seconds.

## 2026.06.27.5

- Kept embedded browser pages at their configured capture size while automatically scaling the preview to fit.

## 2026.06.27.4

- Expanded the Recordings carousel to the full drawer width while keeping the active video centered.
- Removed the white strip beneath recording playback.

## 2026.06.27.3

- Changed release-note dates to ordinal long-form headings.
- Expanded release-note build headings to the full build number.

## 2026.06.27.2

- Implemented daily incremental build version tracking.
- Put the current build version in the navigation footer.
- Added an in-app release notes viewer to the version button.
- Enforced one to five release-note bullets for every build.

## 2026.06.27.1

- Replaced Playwright video capture with direct CDP screencasting.
- Encoded streamed JPEG frames directly to 30 fps H.264 MP4.
- Duplicated the latest frame when Chromium produced no new frame.
- Displayed the live browser stream in the zoomable frame while recording.
