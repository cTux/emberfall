// Full-color Adam7 PNGs retain alpha and progressive decoding without palette quantization.
export const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: true,
  palette: false,
  progressive: true,
} as const;
