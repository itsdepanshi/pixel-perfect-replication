import { describe, expect, it } from "vitest";
import { floodRegion, toArtwork, validDimensions, snapPoint } from "./geometry";
describe("Forge drawing rules", () => {
  it("maps zoomed, panned canvas coordinates", () => { expect(toArtwork({ x: 250, y: 180 }, { width: 800, height: 600, zoom: 2, pan: { x: 10, y: 20 } }, 200, 100)).toEqual({ x: 20, y: -20 }); });
  it("maps fitted centered coordinates independently of screen density", () => { expect(toArtwork({ x: 400, y: 300 }, { width: 800, height: 600, zoom: .5, pan: { x: 0, y: 0 } }, 640, 480)).toEqual({ x: 320, y: 240 }); });
  it("snaps pixel strokes to configurable grid cells", () => { expect(snapPoint({ x: 19, y: 31 }, 8)).toEqual({ x: 16, y: 24 }); });
  it("fills only connected matching pixels without row wrapping", () => { const d = new Uint8ClampedArray(3 * 2 * 4); [0, 2, 3, 4].forEach(i => d[i * 4 + 3] = 255); expect(floodRegion(d, 3, 2, 0, 0).sort()).toEqual([0, 3, 4]); });
  it("rejects out of bounds fill coordinates", () => { expect(floodRegion(new Uint8ClampedArray(16), 2, 2, -1, 0)).toEqual([]); });
  it("rejects unsafe canvas sizes", () => { expect(validDimensions(2048, 2048)).toBe(true); expect(validDimensions(2049, 480)).toBe(false); expect(validDimensions(640.5, 480)).toBe(false); expect(validDimensions(0, 480)).toBe(false); });
});