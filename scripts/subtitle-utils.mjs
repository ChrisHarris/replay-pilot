export const captionLogPrefix = "@replay:caption";

function normaliseCaptionText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\0/g, "")
    .trim();
}

export function captionTextFromConsoleArgs(args = []) {
  const first = String(args[0] ?? "");
  if (first === captionLogPrefix) {
    return normaliseCaptionText(args.slice(1).join(" "));
  }
  if (first.startsWith(`${captionLogPrefix} `)) {
    return normaliseCaptionText(first.slice(captionLogPrefix.length + 1));
  }
  return null;
}

export function createCaptionTimeline(getCurrentTime) {
  const entries = [];
  let activeEntry = null;

  function currentTime() {
    return Math.max(0, Number(getCurrentTime?.() || 0));
  }

  function closeActive(end = currentTime()) {
    if (!activeEntry) return;
    activeEntry.end = Math.max(activeEntry.start, Number(end || 0));
    activeEntry = null;
  }

  return {
    add(text) {
      const start = currentTime();
      closeActive(start);
      const normalisedText = normaliseCaptionText(text);
      if (!normalisedText) return;
      activeEntry = { start, end: start, text: normalisedText };
      entries.push(activeEntry);
    },
    finish(duration) {
      closeActive(Math.max(currentTime(), Number(duration || 0)));
      return entries.filter((entry) => entry.text && entry.end > entry.start);
    }
  };
}

export function syncActionCaption(timeline, index, text) {
  const action = {
    index,
    text: normaliseCaptionText(text)
  };
  timeline.add(action.text);
  return action;
}

function formatSrtTimestamp(seconds) {
  const milliseconds = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function formatVttTimestamp(seconds) {
  return formatSrtTimestamp(seconds).replace(",", ".");
}

export function serializeSrt(entries = []) {
  return entries
    .map((entry, index) => [
      index + 1,
      `${formatSrtTimestamp(entry.start)} --> ${formatSrtTimestamp(entry.end)}`,
      normaliseCaptionText(entry.text)
    ].join("\n"))
    .join("\n\n") + (entries.length ? "\n" : "");
}

export function serializeVtt(entries = []) {
  const cues = entries
    .map((entry) => [
      `${formatVttTimestamp(entry.start)} --> ${formatVttTimestamp(entry.end)}`,
      normaliseCaptionText(entry.text)
    ].join("\n"))
    .join("\n\n");
  return `WEBVTT\n\n${cues}${entries.length ? "\n" : ""}`;
}
