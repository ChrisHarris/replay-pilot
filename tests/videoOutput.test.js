import test from "node:test";
import assert from "node:assert/strict";
import { getOutputQuality } from "../src/lib/projectDefaults.js";
import {
  createScreencastOptions,
  frameMimeTypeFor,
  h264Crf,
  inputCodecFor
} from "../scripts/video-output.mjs";

const viewport = { width: 402, height: 867 };

test("configures the selected JPEG quality", () => {
  const quality = getOutputQuality("jpeg-90");

  assert.deepEqual(createScreencastOptions(viewport, quality), {
    format: "jpeg",
    maxWidth: 402,
    maxHeight: 867,
    everyNthFrame: 1,
    quality: 90
  });
  assert.equal(inputCodecFor(quality), "mjpeg");
  assert.equal(frameMimeTypeFor(quality), "image/jpeg");
});

test("configures lossless PNG frames without a JPEG quality parameter", () => {
  const quality = getOutputQuality("png");
  const options = createScreencastOptions(viewport, quality);

  assert.deepEqual(options, {
    format: "png",
    maxWidth: 402,
    maxHeight: 867,
    everyNthFrame: 1
  });
  assert.equal(inputCodecFor(quality), "png");
  assert.equal(frameMimeTypeFor(quality), "image/png");
});

test("uses H.264 CRF 18", () => {
  assert.equal(h264Crf, 18);
});
