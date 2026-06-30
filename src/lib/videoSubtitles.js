export function setVideoSubtitles(video, enabled) {
  const tracks = Array.from(video?.textTracks || []);
  tracks.forEach((track, index) => {
    track.mode = enabled && index === 0 ? "showing" : "disabled";
  });
}
