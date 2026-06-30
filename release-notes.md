# 30th June 2026

## 2026.06.30.4

- Switched recordings to the standard Web Awesome video controls.

## 2026.06.30.3

- Loaded cross-origin WebVTT tracks correctly so recorded subtitles appear during browser playback.

## 2026.06.30.2

- Added a persistent subtitle toggle to the recordings drawer and moved its accent Close action to the right edge.

## 2026.06.30.1

- Synced each active instruction-tree label into the MP4 as a selectable timed subtitle track.

# 29th June 2026

## 2026.06.29.23

- Kept the scenario scroller within the visible app height so its content scrolls without displacing the action buttons.

## 2026.06.29.22

- Presented scenario instructions inside a vertical Web Awesome scroller.

## 2026.06.29.21

- Added command-specific icons to recorded instruction tree items.
- Progressively softened nested instruction text using Web Awesome semantic text colours.

## 2026.06.29.20

- Updated the Record button to use the circle-dot icon.

## 2026.06.29.19

- Started new scenarios with an empty Text instructions field.

## 2026.06.29.18

- Returned recorded actions to page scope when their instruction nesting leaves a closed drawer.

## 2026.06.29.17

- Added confirmed scenario removal from the edit drawer.
- Archived removed scenario instructions and scripts as `scenario.md` inside a scenario folder ending in `**Removed**`.

## 2026.06.29.16

- Prevented retried Pause commands from saving captured instructions twice and producing duplicate toast items.

## 2026.06.29.15

- Treated explicit page markers as authoritative and ignored transient skeleton states while capturing drawer page changes.
- Replaced duplicate sign-up transition steps with distinct `Sign Up Details` and `Verify Phone Number` pages.

## 2026.06.29.14

- Recorded the tested project address explicitly as `Open URL` and waited for a visible page witness immediately afterwards.
- Shortened `Page Open` instructions to one stable marker, heading, field, or control instead of a list of page content.

## 2026.06.29.13

- Inferred dialog dismissal and its two-second wait from nested instruction structure without showing a `Dialog Closed` step.
- Increased the adjustable default playback step delay to 750 ms.

## 2026.06.29.12

- Captured and replayed labelled Web Awesome dialog opening and closing with scoped actions.
- Added an adjustable 500 ms default delay between ordinary playback steps while preserving two-second component transition waits.

## 2026.06.29.11

- Toggled Web Awesome checkboxes through their public component method to avoid covered internal inputs during playback.

## 2026.06.29.10

- Matched required Web Awesome fields when their rendered accessibility names include required markers.

## 2026.06.29.9

- Located labelled Web Awesome form controls through their host components while retaining native HTML role fallbacks.

## 2026.06.29.8

- Scoped generated Playwright actions to open Web Awesome drawers using their exact `label` attributes.

## 2026.06.29.7

- Highlighted the matching instruction tree item as each Playwright action begins during a run.

## 2026.06.29.6

- Made the generated Playwright script field read-only by disabling its textarea.

## 2026.06.29.5

- Regenerated Playwright code when Text instructions lose focus instead of when the Script tab opens.

## 2026.06.29.4

- Supported existing scenarios with actions nested beneath Open App when regenerating Playwright scripts.

## 2026.06.29.3

- Generated scoped Playwright scripts from captured nested instructions after Pause.
- Added two-second waits after drawer opening, drawer closing, and new drawer pages appearing.
- Regenerated Playwright code when opening the Script tab or saving the edit drawer.

## 2026.06.29.2

- Kept nested select menus from being mistaken for drawer presentation events while capturing instructions.

## 2026.06.29.1

- Turned emitted interactions into live, nested markdown scenario instructions.
- Saved final field values and checked states at interaction boundaries instead of emitting every keystroke.
- Replaced the scenario instructions in the projects file after Pause while preserving its script.

# 28th June 2026

## 2026.06.28.9

- Emitted completed Web Awesome drawer presentation and dismissal interactions.
- Detected new React-rendered pages inside open drawers without collecting field values.

## 2026.06.28.8

- Renamed the tested-app bridge to Emit Interactions and generalized its messaging protocol.
- Changed Record and Pause to log emitted interaction data without altering scenario instructions or scripts.

## 2026.06.28.7

- Added per-project output quality settings for JPEG quality 50, 75, 90, 100, and lossless PNG capture.
- Increased H.264 MP4 output quality with CRF 18 encoding.

## 2026.06.28.6

- Embedded timed scenario captions as a selectable MP4 subtitle track without re-encoding recorded video.
- Added caption markers through `@replay:caption` console messages and the `helpers.caption()` script helper.

## 2026.06.28.5

- Kept the active Run notification visible until the run finishes or is cancelled.

## 2026.06.28.4

- Standardised all toast notifications to dismiss after 1.5 seconds.

## 2026.06.28.3

- Captured live values from native and Web Awesome form controls while recording scenarios.

## 2026.06.28.2

- Added Record and Pause controls for capturing interactions inside project previews.
- Generated scenario instructions and Playwright scripts live from clicked controls, typed values, selections, and action keys.
- Kept sensitive field values private and excluded pointer movement from recordings.

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
