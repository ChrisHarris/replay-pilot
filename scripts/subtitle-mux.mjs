import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";

export function runFfmpeg(args, ffmpegPath = ffmpegStaticPath || "ffmpeg") {
  const child = spawn(ffmpegPath, ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "ignore", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (data) => {
    stderr += data.toString("utf8");
  });
  return new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) resolvePromise();
      else reject(new Error(stderr.trim() || `FFmpeg exited with code ${exitCode}`));
    });
  });
}

export function muxSubtitleTrack(videoPath, subtitlePath, outputPath, ffmpegPath) {
  return runFfmpeg([
    "-i", videoPath,
    "-i", subtitlePath,
    "-map", "0",
    "-map", "1:0",
    "-c", "copy",
    "-c:s", "mov_text",
    "-metadata:s:s:0", "language=eng",
    "-metadata:s:s:0", "title=Replay Pilot captions",
    "-disposition:s:0", "default",
    "-movflags", "+faststart",
    outputPath
  ], ffmpegPath);
}
