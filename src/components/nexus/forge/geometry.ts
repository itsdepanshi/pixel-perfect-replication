export type Point = { x: number; y: number };
export type View = { zoom: number; pan: Point; width: number; height: number };
export const HISTORY_LIMIT = 24;
export const MAX_SIDE = 2048;
export function validDimensions(width: number, height: number) { return Number.isInteger(width) && Number.isInteger(height) && width >= 16 && height >= 16 && width <= MAX_SIDE && height <= MAX_SIDE; }
export function origin(view: View, width: number, height: number): Point { return { x: (view.width - width * view.zoom) / 2 + view.pan.x, y: (view.height - height * view.zoom) / 2 + view.pan.y }; }
export function toArtwork(point: Point, view: View, width: number, height: number): Point { const start = origin(view, width, height); return { x: (point.x - start.x) / view.zoom, y: (point.y - start.y) / view.zoom }; }
export function snapPoint(point: Point, step: number): Point { return { x: Math.floor(point.x / step) * step, y: Math.floor(point.y / step) * step }; }
export function floodRegion(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): number[] {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return [];
  const start = y * width + x; const target = Array.from(data.slice(start * 4, start * 4 + 4));
  const seen = new Uint8Array(width * height); const stack = [start]; const region: number[] = [];
  seen[start] = 1;
  while (stack.length) {
    const p = stack.pop(); if (p === undefined) break;
    if (!target.every((v, c) => Math.abs(v - (data[p * 4 + c] ?? 0)) <= 8)) continue;
    region.push(p);
    for (const n of [p % width > 0 ? p - 1 : -1, p % width < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < width * (height - 1) ? p + width : -1]) {
      if (n >= 0 && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
  }
  return region;
}