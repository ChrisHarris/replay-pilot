export const outputQualityOptions = [
  { value: "jpeg-50", label: "JPEG: Quality 50", format: "jpeg", quality: 50 },
  { value: "jpeg-75", label: "JPEG: Quality 75", format: "jpeg", quality: 75 },
  { value: "jpeg-90", label: "JPEG: Quality 90", format: "jpeg", quality: 90 },
  { value: "jpeg-100", label: "JPEG: Quality 100", format: "jpeg", quality: 100 },
  { value: "png", label: "PNG", format: "png" }
];

export const defaultCapture = {
  width: 402,
  height: 867,
  resolution: 2,
  outputQuality: "jpeg-75"
};

export function getOutputQuality(value) {
  return outputQualityOptions.find((option) => option.value === value)
    || outputQualityOptions.find((option) => option.value === defaultCapture.outputQuality);
}
