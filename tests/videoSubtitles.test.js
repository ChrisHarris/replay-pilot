import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setVideoSubtitles } from "../src/lib/videoSubtitles.js";

test("shows the first embedded subtitle track and disables every track when toggled off", () => {
  const video = {
    textTracks: [
      { mode: "disabled" },
      { mode: "showing" }
    ]
  };

  setVideoSubtitles(video, true);
  assert.deepEqual(video.textTracks.map((track) => track.mode), ["showing", "disabled"]);

  setVideoSubtitles(video, false);
  assert.deepEqual(video.textTracks.map((track) => track.mode), ["disabled", "disabled"]);
});

test("renders the requested recordings subtitle toggle and right-edge accent Close action", async () => {
  const source = await readFile(new URL("../src/components/Drawer_Recordings.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../public/css/styles.css", import.meta.url), "utf8");

  assert.match(source, /subtitlesEnabled \? "subtitles" : "subtitles-slash"/);
  assert.match(source, /subtitlesEnabled \? "Subtitles" : "Subtitles off"/);
  assert.match(source, /appearance=\{subtitlesEnabled \? "filled" : "accent"\}/);
  assert.match(source, /<wa-video[^>]*controls="standard"/);
  assert.match(source, /nativeVideo\.crossOrigin = "anonymous";\s*nativeVideo\.load\(\);/);
  assert.match(source, /track\.addEventListener\("load", applySubtitles\)/);
  assert.match(source, /kind="subtitles"[\s\S]*src=\{subtitleUrl\}[\s\S]*default=\{subtitlesEnabled\}/);
  assert.match(source, /appearance="accent" onClick=\{onCancel\}/);
  assert.match(styles, /\.recordings-actions\s*\{\s*justify-content: space-between;/);
});
