import { useRef } from "react";
import { useBoard } from "../store";
import { sound } from "../sound";
import { Icon } from "./icons";

const btn =
  "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition select-none";

export default function Toolbar() {
  const mode = useBoard((s) => s.mode);
  const fileRef = useRef(null);

  const doExport = () => {
    const { elements, links } = useBoard.getState();
    const data = { elements, links };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brainboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data.elements) && Array.isArray(data.links)) {
          useBoard.getState().importBoard(data);
          sound.focus();
        }
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2.5 py-2.5 bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto select-none">
      <button
        onClick={() => { useBoard.getState().addElement(); sound.add(); }}
        className={btn + " bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"}
      >
        <Icon.Plus /> New idea
      </button>

      <span className="w-px h-7 bg-white/10" />

      <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1">
        <button
          onClick={() => useBoard.getState().setMode("move")}
          className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition " + (mode === "move" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white")}
        >
          <Icon.Move /> Move
        </button>
        <button
          onClick={() => { useBoard.getState().setMode("link"); sound.toggle(); }}
          className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition " + (mode === "link" ? "bg-amber-500 text-white" : "text-slate-400 hover:text-white")}
        >
          <Icon.Link /> Link
        </button>
      </div>

      <span className="w-px h-7 bg-white/10" />

      <button onClick={() => { useBoard.getState().resetCamera(); sound.toggle(); }} title="Reset view (R)"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition">
        <Icon.Home />
      </button>
      <button onClick={doExport} title="Export board"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition">
        <Icon.Download />
      </button>
      <button onClick={() => fileRef.current && fileRef.current.click()} title="Import board"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition">
        <Icon.Upload />
      </button>
      <button onClick={() => { if (confirm("Clear the whole board?")) { useBoard.getState().clearBoard(); sound.remove(); } }} title="Clear board"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition">
        <Icon.Trash />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => { doImport(e.target.files && e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );
}
