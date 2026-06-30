import test from "node:test";
import assert from "node:assert/strict";
import {
  captionTextFromConsoleArgs,
  createCaptionTimeline,
  serializeSrt,
  serializeVtt,
  syncActionCaption
} from "../scripts/subtitle-utils.mjs";

test("reads Replay Pilot caption console messages", () => {
  assert.equal(captionTextFromConsoleArgs(["@replay:caption Enter your name"]), "Enter your name");
  assert.equal(captionTextFromConsoleArgs(["@replay:caption", "Tap", "Continue"]), "Tap Continue");
  assert.equal(captionTextFromConsoleArgs(["ordinary log"]), null);
});

test("closes each caption when the next caption starts", () => {
  let time = 0;
  const timeline = createCaptionTimeline(() => time);
  timeline.add("Open the form");
  time = 1.25;
  timeline.add("Enter your name");
  time = 3;

  assert.deepEqual(timeline.finish(3), [
    { start: 0, end: 1.25, text: "Open the form" },
    { start: 1.25, end: 3, text: "Enter your name" }
  ]);
});

test("uses the current instruction-tree label for the synced action caption", () => {
  let time = 0;
  const timeline = createCaptionTimeline(() => time);

  assert.deepEqual(syncActionCaption(timeline, 4, "  Tap Button: Continue  "), {
    index: 4,
    text: "Tap Button: Continue"
  });
  time = 1.5;

  assert.deepEqual(timeline.finish(time), [{
    start: 0,
    end: 1.5,
    text: "Tap Button: Continue"
  }]);
});

test("serializes captions as SubRip timestamps", () => {
  assert.equal(serializeSrt([
    { start: 0, end: 1.25, text: "Open the form" },
    { start: 61.5, end: 63, text: "Enter your name" }
  ]), [
    "1",
    "00:00:00,000 --> 00:00:01,250",
    "Open the form",
    "",
    "2",
    "00:01:01,500 --> 00:01:03,000",
    "Enter your name",
    ""
  ].join("\n"));
});

test("serializes browser playback captions as WebVTT", () => {
  assert.equal(serializeVtt([
    { start: 0, end: 1.25, text: "Tap Button: Continue" }
  ]), [
    "WEBVTT",
    "",
    "00:00:00.000 --> 00:00:01.250",
    "Tap Button: Continue",
    ""
  ].join("\n"));
});
