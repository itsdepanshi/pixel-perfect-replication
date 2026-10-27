import { describe, expect, it } from "vitest";
import { readAll, type Appearance } from "./local-storage";
import { defaultAppearance, saveAppearance, validateWallpaper } from "./appearance";

describe("desktop appearance", () => {
  it("preserves wallpaper and fit when changing theme without duplicate records", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    await saveAppearance({ wallpaper: blob, wallpaperName: "My wallpaper.png", fit: "contain" });
    await saveAppearance({ theme: "cyan" });
    const records = await readAll<Appearance>("preferences");
    expect(records).toHaveLength(1);
    expect(records[0].theme).toBe("cyan");
    expect(records[0].wallpaper?.size).toBe(blob.size);
    expect(records[0].wallpaperName).toBe("My wallpaper.png");
    expect(records[0].fit).toBe("contain");
  });
  it("restores the original wallpaper without resetting the chosen color", async () => {
    await saveAppearance({ theme: "rose" });
    await saveAppearance({ wallpaper: null, wallpaperName: defaultAppearance.wallpaperName });
    const records = await readAll<Appearance>("preferences");
    expect(records[0].theme).toBe("rose");
    expect(records[0].wallpaper).toBeNull();
  });
  it("rejects non-image uploads", async () => {
    await expect(validateWallpaper(new File(["text"], "note.txt", { type: "text/plain" }))).rejects.toThrow("Choose a PNG");
  });
});