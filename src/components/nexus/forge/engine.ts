import { floodRegion, toArtwork, snapPoint, HISTORY_LIMIT, type Point, type View } from "./geometry";
import type { DrawingProject } from "../local-storage";

export type Tool = "pencil" | "brush" | "eraser" | "line" | "rectangle" | "ellipse" | "fill" | "eyedropper" | "pan";
export type Layer = { id: string; name: string; visible: boolean; opacity: number; canvas: HTMLCanvasElement };
type Snapshot = { width: number; height: number; background: string | null; layers: Layer[]; selected: string };
export type Options = { tool: Tool; color: string; size: number; opacity: number; symmetry: boolean; pixel: boolean; pixelSize: number; grid: boolean; gridSize: number };
function canvas(width: number, height: number) { const c = document.createElement("canvas"); c.width = width; c.height = height; return c; }
function context(c: HTMLCanvasElement) { const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Drawing is unavailable in this browser."); return ctx; }
function copy(c: HTMLCanvasElement) { const result = canvas(c.width, c.height); context(result).drawImage(c, 0, 0); return result; }
function blob(c: HTMLCanvasElement, type = "image/png") { return new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("Could not export artwork.")), type, .94)); }
export class ForgeEngine {
  width = 640; height = 480; background: string | null = null;
  layers: Layer[] = []; selected = ""; revision = 0;
  undoStack: Snapshot[] = []; redoStack: Snapshot[] = [];
  view: View = { width: 1, height: 1, zoom: 1, pan: { x: 0, y: 0 } };
  options: Options = { tool: "brush", color: "#A3FF12", size: 12, opacity: 1, symmetry: false, pixel: false, pixelSize: 8, grid: false, gridSize: 16 };
  gesture: { start: Point; last: Point; pressure: number; base: HTMLCanvasElement; layer: Layer; tool: Tool; options: Options; touched: Set<string> } | null = null;
  composite: HTMLCanvasElement;
  constructor(public display: HTMLCanvasElement, public changed: () => void, public picked: (color: string) => void) { this.composite = canvas(this.width, this.height); this.reset(640, 480); }
  get activeLayer() { return this.layers.find(l => l.id === this.selected); }
  private snapshot(): Snapshot { return { width: this.width, height: this.height, background: this.background, selected: this.selected, layers: this.layers.map(l => ({ ...l, canvas: copy(l.canvas) })) }; }
  private restore(s: Snapshot) { this.width = s.width; this.height = s.height; this.background = s.background; this.layers = s.layers; this.selected = s.selected; this.composite = canvas(s.width, s.height); this.touch(); }
  record() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift(); this.redoStack = []; }
  touch() { this.revision++; this.render(); this.changed(); }
  edit(action: () => void) { this.finish(); this.record(); action(); this.touch(); }
  undo() { this.finish(); const s = this.undoStack.pop(); if (s) { this.redoStack.push(this.snapshot()); this.restore(s); } }
  redo() { this.finish(); const s = this.redoStack.pop(); if (s) { this.undoStack.push(this.snapshot()); this.restore(s); } }
  reset(width: number, height: number) { this.gesture = null; this.width = width; this.height = height; this.background = null; const layer = { id: crypto.randomUUID(), name: "Layer 1", visible: true, opacity: 1, canvas: canvas(width, height) }; this.layers = [layer]; this.selected = layer.id; this.composite = canvas(width, height); this.undoStack = []; this.redoStack = []; this.fit(); this.touch(); }
  resize(width: number, height: number) { this.edit(() => { this.layers = this.layers.map(l => { const c = canvas(width, height); context(c).drawImage(l.canvas, 0, 0); return { ...l, canvas: c }; }); this.width = width; this.height = height; this.composite = canvas(width, height); this.fit(); }); }
  addLayer() { this.edit(() => { const l = { id: crypto.randomUUID(), name: `Layer ${this.layers.length + 1}`, visible: true, opacity: 1, canvas: canvas(this.width, this.height) }; this.layers.push(l); this.selected = l.id; }); }
  deleteLayer() { if (this.layers.length < 2) return; this.edit(() => { this.layers = this.layers.filter(l => l.id !== this.selected); this.selected = this.layers.at(-1)?.id ?? ""; }); }
  layerEdit(id: string, value: Partial<Pick<Layer, "name" | "opacity" | "visible">>) { this.edit(() => { const l = this.layers.find(l => l.id === id); if (l) Object.assign(l, value); }); }
  reorder(direction: number) { const i = this.layers.findIndex(l => l.id === this.selected); const next = i + direction; const l = this.layers[i]; const other = this.layers[next]; if (!l || !other) return; this.edit(() => { this.layers[i] = other; this.layers[next] = l; }); }
  clear() { this.edit(() => this.layers.forEach(l => context(l.canvas).clearRect(0, 0, this.width, this.height))); }
  setBackground(color: string | null) { this.edit(() => { this.background = color; }); }
  fit() { this.view.zoom = Math.max(.05, Math.min(2, (this.view.width - 48) / this.width, (this.view.height - 48) / this.height)); this.view.pan = { x: 0, y: 0 }; this.render(); this.changed(); }
  zoom(value: number, anchor?: Point) { const at = anchor ?? { x: this.view.width / 2, y: this.view.height / 2 }; const before = toArtwork(at, this.view, this.width, this.height); this.view.zoom = Math.max(.05, Math.min(16, value)); const after = toArtwork(at, this.view, this.width, this.height); this.view.pan.x += (after.x - before.x) * this.view.zoom; this.view.pan.y += (after.y - before.y) * this.view.zoom; this.render(); this.changed(); }
  sizeDisplay(width: number, height: number) { this.view.width = width; this.view.height = height; const dpr = window.devicePixelRatio || 1; this.display.width = Math.round(width * dpr); this.display.height = Math.round(height * dpr); this.render(); }
  flatten(background = this.background) { const c = canvas(this.width, this.height); const ctx = context(c); if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, this.width, this.height); } for (const l of this.layers) if (l.visible) { ctx.globalAlpha = l.opacity; ctx.drawImage(l.canvas, 0, 0); } ctx.globalAlpha = 1; return c; }
  render() {
    if (!this.display.width || !this.display.height) return;
    this.composite = this.flatten(); const ctx = context(this.display); const dpr = this.display.width / this.view.width; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, this.view.width, this.view.height);
    const start = { x: (this.view.width - this.width * this.view.zoom) / 2 + this.view.pan.x, y: (this.view.height - this.height * this.view.zoom) / 2 + this.view.pan.y };
    ctx.save(); ctx.translate(start.x, start.y); ctx.scale(this.view.zoom, this.view.zoom);
    const css = getComputedStyle(this.display); const light = css.getPropertyValue("--forge-paper").trim(); const dark = css.getPropertyValue("--forge-checker").trim(); ctx.fillStyle = light; ctx.fillRect(0, 0, this.width, this.height);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.width, this.height); ctx.clip(); ctx.fillStyle = dark;
    for (let y = 0; y < this.height; y += 16) for (let x = 0; x < this.width; x += 16) if ((x / 16 + y / 16) % 2 === 0) ctx.fillRect(x, y, 16, 16);
    ctx.imageSmoothingEnabled = !this.options.pixel; ctx.drawImage(this.composite, 0, 0);
    if (this.options.grid && this.options.gridSize * this.view.zoom >= 3) { ctx.beginPath(); const step = this.options.gridSize; for (let x = 0; x <= this.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, this.height); } for (let y = 0; y <= this.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(this.width, y); } ctx.strokeStyle = css.getPropertyValue("--forge-grid").trim(); ctx.lineWidth = .5 / this.view.zoom; ctx.stroke(); }
    if (this.options.symmetry) { ctx.beginPath(); ctx.moveTo(this.width / 2, 0); ctx.lineTo(this.width / 2, this.height); ctx.strokeStyle = css.getPropertyValue("--primary").trim(); ctx.setLineDash([4 / this.view.zoom, 4 / this.view.zoom]); ctx.lineWidth = 1 / this.view.zoom; ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = css.getPropertyValue("--border").trim(); ctx.lineWidth = 1 / this.view.zoom; ctx.strokeRect(0, 0, this.width, this.height); ctx.restore();
  }
  begin(point: Point, pressure: number) {
    this.finish(); const p = toArtwork(point, this.view, this.width, this.height); const l = this.activeLayer;
    if (!l || this.options.tool === "pan") return;
    if (p.x < 0 || p.y < 0 || p.x >= this.width || p.y >= this.height) return;
    if (this.options.tool === "eyedropper") { const v = context(this.composite).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data; if (v[3]) this.picked("#" + Array.from(v.slice(0, 3)).map(n => n.toString(16).padStart(2, "0")).join("")); return; }
    if (!l.visible) throw new Error("Show the active layer before drawing.");
    this.record();
    if (this.options.tool === "fill") { const ctx = context(l.canvas); const data = ctx.getImageData(0, 0, this.width, this.height); const pixels = floodRegion(data.data, this.width, this.height, p.x, p.y); const mask = canvas(this.width, this.height); const m = context(mask).createImageData(this.width, this.height); for (const i of pixels) m.data[i * 4 + 3] = 255; context(mask).putImageData(m, 0, 0); const mc = context(mask); mc.globalCompositeOperation = "source-in"; mc.fillStyle = this.options.color; mc.fillRect(0, 0, this.width, this.height); ctx.save(); ctx.globalAlpha = this.options.opacity; ctx.drawImage(mask, 0, 0); ctx.restore(); this.touch(); return; }
    this.gesture = { start: p, last: p, pressure, base: copy(l.canvas), layer: l, tool: this.options.tool, options: { ...this.options }, touched: new Set() };
    if (["pencil", "brush", "eraser"].includes(this.options.tool)) this.stroke(p, p, pressure); this.render();
  }
  move(point: Point, pressure: number) { const g = this.gesture; if (!g) return; const p = toArtwork(point, this.view, this.width, this.height); if (["line", "rectangle", "ellipse"].includes(g.tool)) { const ctx = context(g.layer.canvas); ctx.clearRect(0, 0, this.width, this.height); ctx.drawImage(g.base, 0, 0); this.shape(g.start, p); } else this.stroke(g.last, p, pressure); g.last = p; this.render(); }
  finish() { if (this.gesture) { this.gesture = null; this.touch(); } }
  cancel() { const g = this.gesture; if (g) { const ctx = context(g.layer.canvas); ctx.clearRect(0, 0, this.width, this.height); ctx.drawImage(g.base, 0, 0); this.gesture = null; this.undoStack.pop(); this.render(); this.changed(); } }
  private stroke(a: Point, b: Point, pressure: number) {
    const g = this.gesture; if (!g) return; const o = g.options; const ctx = context(g.layer.canvas); ctx.save(); ctx.globalAlpha = o.opacity; ctx.globalCompositeOperation = g.tool === "eraser" ? "destination-out" : "source-over"; ctx.fillStyle = o.color; ctx.strokeStyle = o.color;
    const size = g.tool === "pencil" ? 1 : o.size * Math.max(.15, pressure); ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const draw = (p: Point, q: Point) => {
      if (o.pixel) { const steps = Math.ceil(Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y))) || 1; for (let i = 0; i <= steps; i++) { const cell = snapPoint({ x: p.x + (q.x - p.x) * i / steps, y: p.y + (q.y - p.y) * i / steps }, o.pixelSize); const key = `${cell.x},${cell.y}`; if (!g.touched.has(key)) { g.touched.add(key); ctx.fillRect(cell.x, cell.y, o.pixelSize, o.pixelSize); } } }
      else { ctx.beginPath(); if (p.x === q.x && p.y === q.y) { ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill(); } else { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }
    };
    draw(a, b); if (o.symmetry) draw({ x: this.width - a.x, y: a.y }, { x: this.width - b.x, y: b.y }); ctx.restore();
  }
  private shape(a: Point, b: Point) { const g = this.gesture; if (!g) return; const o = g.options; const ctx = context(g.layer.canvas); ctx.save(); ctx.strokeStyle = o.color; ctx.globalAlpha = o.opacity; ctx.lineWidth = o.size; ctx.lineCap = "round";
    const draw = (start: Point, end: Point) => { if (o.pixel) { start = snapPoint(start, o.pixelSize); end = snapPoint(end, o.pixelSize); } ctx.beginPath(); if (g.tool === "line") { ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); } else if (g.tool === "rectangle") ctx.rect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(end.x - start.x), Math.abs(end.y - start.y)); else ctx.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2); ctx.stroke(); };
    draw(a, b); if (o.symmetry) draw({ x: this.width - a.x, y: a.y }, { x: this.width - b.x, y: b.y }); ctx.restore();
  }
  async project(id: string, name: string, swatches: string[]): Promise<DrawingProject> { this.finish(); const width = this.width, height = this.height, background = this.background; const layers = this.layers.map(l => ({ ...l, canvas: copy(l.canvas) })); return { id, name, width, height, background, modified: Date.now(), swatches: [...swatches], layers: await Promise.all(layers.map(async l => ({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blob: await blob(l.canvas) }))) }; }
  async load(project: DrawingProject) { const layers = await Promise.all(project.layers.map(async l => { const image = await createImageBitmap(l.blob); const c = canvas(project.width, project.height); context(c).drawImage(image, 0, 0); image.close(); return { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, canvas: c }; })); this.gesture = null; this.width = project.width; this.height = project.height; this.background = project.background; this.layers = layers; this.selected = layers.at(-1)?.id ?? ""; this.composite = canvas(this.width, this.height); this.undoStack = []; this.redoStack = []; this.fit(); this.touch(); }
  async importImage(file: File, asNew: boolean) { const image = await createImageBitmap(file); try { if (image.width > 2048 || image.height > 2048) throw new Error("Images must be no larger than 2048 × 2048 pixels."); if (asNew) this.reset(image.width, image.height); else this.addLayer(); const l = this.activeLayer; if (!l) return; if (asNew) this.record(); context(l.canvas).drawImage(image, 0, 0); l.name = file.name; this.touch(); } finally { image.close(); } }
  export(type: "image/png" | "image/jpeg", background: string) { this.finish(); return blob(this.flatten(type === "image/jpeg" ? background : this.background), type); }
}