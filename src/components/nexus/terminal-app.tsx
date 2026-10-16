import { useEffect, useRef, useState } from "react";
import { executeCommand, SECRET_COMMAND, SECRET_EVENT } from "./terminal-commands";

type Entry = { command: string; output: string[] };
export function TerminalApp({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) input.current?.focus({ preventScroll: true }); }, [active]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [entries]);
  return <div className="terminal-app" onClick={() => input.current?.focus({ preventScroll: true })}>
    <div className="terminal-banner"><span className="terminal-mark">N<span>_</span></span><div><h2>NEXUS TERMINAL <span>v1.0.0</span></h2><p>Your system. Your rules.</p></div></div>
    <div className="startup-output"><p><span>[ OK ]</span> Initializing nexus kernel...</p><p><span>[ OK ]</span> Mounting virtual filesystem</p><p><span>[ OK ]</span> Establishing secure local session</p><p><span>[ OK ]</span> All systems operational</p></div>
    <p className="terminal-help">Welcome back, root. Type <span>'help'</span> to get started.</p>
    <div className="terminal-history" aria-live="polite" aria-label="Terminal output">{entries.map((entry, i) => <div className="terminal-entry" key={i}><p><span className="prompt">root@nexus<span>:~$</span></span> {entry.command}</p>{entry.output.map((line, j) => <pre key={j}>{line || " "}</pre>)}</div>)}</div>
    <form className="terminal-input-row" onSubmit={event => { event.preventDefault(); if (!value.trim()) return; if (value.trim().toLowerCase() === "clear") setEntries([]); else { setEntries(prev => [...prev, { command: value, output: executeCommand(value) }]); if (value.trim().toLowerCase() === SECRET_COMMAND) window.dispatchEvent(new Event(SECRET_EVENT)); } setValue(""); }}>
      <label htmlFor="terminal-command" className="prompt">root@nexus<span>:~$</span></label>
      <div className="terminal-input-wrap"><input id="terminal-command" aria-label="Terminal command" ref={input} autoComplete="off" autoCapitalize="off" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} /><span className={value ? "cursor cursor-hidden" : "cursor"} /></div>
    </form><div ref={end} />
  </div>;
}