import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const versionPath = resolve(rootDir, "src/buildVersion.js");
const releaseNotesPath = resolve(rootDir, "release-notes.md");
const now = new Date();
const date = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0")
].join(".");

const currentSource = await readFile(versionPath, "utf8").catch(() => "");
const currentVersion = currentSource.match(/BUILD_VERSION\s*=\s*["'](\d{4}\.\d{2}\.\d{2})\.(\d+)["']/);
const nextBuild = currentVersion?.[1] === date ? Number(currentVersion[2]) + 1 : 1;
const nextVersion = `${date}.${nextBuild}`;
const releaseNotes = await readFile(releaseNotesPath, "utf8").catch(() => "");
const day = now.getDate();
const daySuffix = day % 100 >= 11 && day % 100 <= 13
  ? "th"
  : day % 10 === 1
    ? "st"
    : day % 10 === 2
      ? "nd"
      : day % 10 === 3
        ? "rd"
        : "th";
const month = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
][now.getMonth()];
const releaseDateHeading = `# ${day}${daySuffix} ${month} ${now.getFullYear()}`;
const dateStart = releaseNotes.indexOf(`${releaseDateHeading}\n`);

if (dateStart < 0) {
  throw new Error(`Add ${releaseDateHeading} to release-notes.md before building ${nextVersion}.`);
}

const dateAndLater = releaseNotes.slice(dateStart + releaseDateHeading.length + 1);
const nextDateOffset = dateAndLater.search(/^# /m);
const dateSection = nextDateOffset >= 0 ? dateAndLater.slice(0, nextDateOffset) : dateAndLater;
const buildHeading = `## ${nextVersion}`;
const buildStart = dateSection.search(new RegExp(`^${buildHeading}$`, "m"));

if (buildStart < 0) {
  throw new Error(`Add ${buildHeading} under ${releaseDateHeading} before building ${nextVersion}.`);
}

const buildAndLater = dateSection.slice(buildStart + buildHeading.length);
const nextBuildOffset = buildAndLater.search(/^## /m);
const buildSection = nextBuildOffset >= 0 ? buildAndLater.slice(0, nextBuildOffset) : buildAndLater;
const bulletCount = (buildSection.match(/^- /gm) || []).length;

if (bulletCount < 1 || bulletCount > 5) {
  throw new Error(`${releaseDateHeading} ${buildHeading} must contain one to five bullets; found ${bulletCount}.`);
}

await writeFile(
  versionPath,
  `// Updated automatically by npm run build.\nexport const BUILD_VERSION = "${nextVersion}";\n`
);

console.log(`Replay Pilot build ${nextVersion}`);
