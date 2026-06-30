import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { muxSubtitleTrack, runFfmpeg } from "../scripts/subtitle-mux.mjs";

test("muxes an MP4 subtitle track without re-encoding the video", async () => {
  const directory = await mkdtemp(join(tmpdir(), "replay-pilot-subtitles-"));
  const sourcePath = join(directory, "source.mp4");
  const subtitlePath = join(directory, "captions.srt");
  const outputPath = join(directory, "captioned.mp4");

  try {
    await runFfmpeg([
      "-f", "lavfi",
      "-i", "color=c=black:s=64x64:d=1",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      sourcePath
    ]);
    await writeFile(subtitlePath, "1\n00:00:00,000 --> 00:00:01,000\nRecorded step\n");
    await muxSubtitleTrack(sourcePath, subtitlePath, outputPath);

    // Mapping the first subtitle stream fails when the MP4 has no embedded subtitle track.
    await runFfmpeg(["-i", outputPath, "-map", "0:s:0", "-c:s", "srt", "-f", "srt", "/dev/null"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
