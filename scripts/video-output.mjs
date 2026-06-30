export const h264Crf = 18;

export function inputCodecFor(outputQuality) {
  return outputQuality.format === "png" ? "png" : "mjpeg";
}

export function frameMimeTypeFor(outputQuality) {
  return outputQuality.format === "png" ? "image/png" : "image/jpeg";
}

export function createScreencastOptions(viewport, outputQuality) {
  const options = {
    format: outputQuality.format,
    maxWidth: viewport.width,
    maxHeight: viewport.height,
    everyNthFrame: 1
  };

  if (outputQuality.format === "jpeg") options.quality = outputQuality.quality;
  return options;
}
