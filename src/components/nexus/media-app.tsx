import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Disc3, Music2, Pause, Play, Plus, SkipBack, SkipForward, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRecord, formatDuration, isAudioFile, readAll, writeRecord, type Track } from "./local-storage";

export function MediaApp() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const autoplay = useRef(false);
  const active = tracks.find(track => track.id === activeId);
  useEffect(() => {
    let live = true;
    void readAll<Track>("tracks").then(rows => { if (live) { const sorted = rows.sort((a, b) => a.added - b.added); setTracks(sorted); setActiveId(sorted[0]?.id ?? null); } }).catch(() => { if (live) setError("Could not restore your media. Check local storage permissions."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.pause(); setTime(0); setDuration(active?.duration ?? 0); setPlaying(false);
    if (!active) { player.removeAttribute("src"); player.load(); return; }
    const url = URL.createObjectURL(active.blob);
    player.src = url; player.load();
    if (autoplay.current) { autoplay.current = false; void player.play().catch(() => { setError("This file could not be played. It may be damaged or use an unsupported audio format."); }); }
    return () => { player.pause(); player.removeAttribute("src"); player.load(); URL.revokeObjectURL(url); };
  }, [activeId]);
  useEffect(() => { if (audio.current) { audio.current.volume = volume; audio.current.muted = muted; } }, [volume, muted]);
  async function importFiles(files: FileList | null) {
    if (!files || importing) return;
    setImporting(true); setError("");
    const failures: string[] = [];
    const imported: Track[] = [];
    for (const file of Array.from(files)) {
      if (!isAudioFile(file)) { failures.push(`${file.name}: not a supported audio file.`); continue; }
      const track: Track = { id: crypto.randomUUID(), name: file.name, blob: file, duration: null, added: Date.now() + imported.length };
      try { await writeRecord("tracks", track); imported.push(track); } catch { failures.push(`${file.name}: could not save locally. Storage may be full.`); }
    }
    setTracks(prev => [...prev, ...imported]);
    setActiveId(prev => prev ?? imported[0]?.id ?? null);
    if (failures.length) setError(failures.join(" "));
    setImporting(false);
    if (picker.current) picker.current.value = "";
  }
  function select(track: Track, play = true) {
    setError("");
    if (track.id === activeId) { if (play) void audio.current?.play().catch(() => setError("Unable to play this file. Try another supported audio file.")); return; }
    autoplay.current = play; setActiveId(track.id);
  }
  function next(direction: number, play = playing) {
    if (!tracks.length) return;
    const index = tracks.findIndex(track => track.id === activeId);
    const track = tracks[(index + direction + tracks.length) % tracks.length];
    if (track) select(track, play);
  }
  async function togglePlay() {
    const player = audio.current;
    if (!player || !active) return;
    if (!player.paused) player.pause();
    else { setError(""); try { await player.play(); } catch { setError("This file could not be played. It may be damaged or use an unsupported audio format."); } }
  }
  async function remove(track: Track) {
    try {
      await deleteRecord("tracks", track.id);
      const remaining = tracks.filter(item => item.id !== track.id);
      if (activeId === track.id) { audio.current?.pause(); autoplay.current = false; setActiveId(remaining[0]?.id ?? null); }
      setTracks(remaining);
    } catch { setError("Could not remove this track from local storage. Try again."); }
  }
  function metadata() {
    const value = audio.current?.duration;
    if (!active || value === undefined || !Number.isFinite(value)) return;
    setDuration(value);
    const updated = { ...active, duration: value };
    setTracks(prev => prev.map(track => track.id === active.id ? updated : track));
    void writeRecord("tracks", updated).catch(() => setError("Playback is available, but duration metadata could not be saved."));
  }
  return <div className="media-app local-app"><div className="local-app-toolbar"><span className="app-section-title"><Disc3 size={15} /> MEDIA <span>{tracks.length.toString().padStart(2, "0")}</span></span><Button variant="system" className="primary-action" disabled={loading || importing} onClick={() => picker.current?.click()}><Plus />{importing ? "Importing..." : "Add Media"}</Button><input ref={picker} type="file" aria-label="Import audio files" hidden accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm,.aiff" multiple onChange={event => void importFiles(event.target.files)} /></div>
    {error && <div className="local-error" role="alert"><AlertTriangle size={13} />{error}</div>}
    <div className="media-library">{!tracks.length ? <div className="local-empty"><Disc3 size={38} /><h2>{loading ? "Opening library..." : "Your library is quiet."}</h2>{!loading && <Button variant="system" className="primary-action" disabled={importing} onClick={() => picker.current?.click()}><Plus /> Import your first track</Button>}</div> : <><div className="playlist-heading"><span>LOCAL LIBRARY</span><span>{tracks.length} TRACK{tracks.length !== 1 ? "S" : ""}</span></div>{tracks.map((track, index) => <div key={track.id} className="track-row" data-selected={track.id === activeId}><Button variant="system" className="track-select" aria-label={`Play ${track.name}`} onClick={() => select(track)}><span className="track-number">{track.id === activeId && playing ? <ActivityBars /> : String(index + 1).padStart(2, "0")}</span><Music2 /><span className="track-details"><span>{track.name}</span><span>{track.id === activeId ? playing ? "PLAYING" : "PAUSED" : "LOCAL FILE"}</span></span><time>{formatDuration(track.duration)}</time></Button><Button variant="system" size="icon" aria-label={`Remove ${track.name}`} title={`Remove ${track.name}`} onClick={() => void remove(track)}><Trash2 /></Button><audio className="metadata-audio" preload="metadata" ref={element => { if (!element || track.duration !== null || element.src) return; const url = URL.createObjectURL(track.blob); element.src = url; const release = () => { URL.revokeObjectURL(url); element.removeAttribute("src"); }; element.onloadedmetadata = () => { const d = element.duration; if (Number.isFinite(d)) { const updated = { ...track, duration: d }; setTracks(prev => prev.map(item => item.id === track.id ? updated : item)); void writeRecord("tracks", updated).catch(() => {}); } release(); }; element.onerror = release; }} /></div>)}</> }</div>
    <div className="media-player"><div className="now-playing"><div className="album-symbol"><Disc3 size={25} /></div><div><span>NOW PLAYING</span><strong>{active?.name ?? "No track selected"}</strong></div><span className="playback-state">{playing ? "PLAYING" : "PAUSED"}</span></div><div className="seek-row"><time>{formatDuration(time)}</time><input type="range" aria-label="Seek" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} disabled={!active || !duration} onChange={event => { const value = Number(event.target.value); if (audio.current) audio.current.currentTime = value; setTime(value); }} /><time>{formatDuration(duration || active?.duration || null)}</time></div><div className="player-controls"><div className="transport"><Button variant="system" size="icon" aria-label="Previous track" title="Previous track" disabled={!active} onClick={() => next(-1)}><SkipBack /></Button><Button variant="system" size="icon" className="play-button" aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} disabled={!active} onClick={() => void togglePlay()}>{playing ? <Pause /> : <Play />}</Button><Button variant="system" size="icon" aria-label="Next track" title="Next track" disabled={!active} onClick={() => next(1)}><SkipForward /></Button></div><span className="player-local">LOCAL AUDIO</span><div className="volume-control"><Button variant="system" size="icon" aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"} onClick={() => setMuted(v => !v)}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</Button><input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={volume} onChange={event => setVolume(Number(event.target.value))} /></div></div></div>
    <audio ref={audio} aria-label="Audio player" preload="metadata" onLoadedMetadata={metadata} onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => next(1, true)} onError={() => { if (activeId) { setPlaying(false); setError("Cannot decode this audio file. Its format may be unsupported or the file may be damaged."); } }} />
  </div>;
}
function ActivityBars() { return <span className="audio-activity" aria-hidden="true"><i /><i /><i /></span>; }