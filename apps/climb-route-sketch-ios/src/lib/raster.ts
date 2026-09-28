import { toByteArray } from "base64-js";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";

/** RGBA pixel buffer, equivalent to the web app's ImageData. */
export interface RasterImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Processing resolution cap (matches the web app). */
export const MAX_DIM = 1000;

/**
 * Load an image URI into an RGBA buffer: downscale + re-encode as JPEG via
 * expo-image-manipulator (which also normalizes HEIC camera shots), then
 * decode the JPEG in pure JS. Works on iOS, Android, and web.
 */
export async function loadRaster(
  uri: string,
  width: number,
  height: number,
): Promise<RasterImage> {
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri);
  if (scale < 1) {
    context.resize({ width: Math.max(1, Math.round(width * scale)) });
  }
  const rendered = await context.renderAsync();
  try {
    const result = await rendered.saveAsync({
      base64: true,
      compress: 0.92,
      format: SaveFormat.JPEG,
    });
    if (!result.base64) throw new Error("Image encoding returned no data");
    const jpegBytes = toByteArray(result.base64);
    const decoded = decode(jpegBytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 256,
    });
    return {
      data: new Uint8ClampedArray(
        decoded.data.buffer,
        decoded.data.byteOffset,
        decoded.data.byteLength,
      ),
      width: decoded.width,
      height: decoded.height,
    };
  } finally {
    rendered.release();
  }
}
