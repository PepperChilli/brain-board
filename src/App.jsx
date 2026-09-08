import { useEffect } from "react";
import Board from "./Board";
import TopBar from "./components/TopBar";
import Toolbar from "./components/Toolbar";
import Inspector from "./components/Inspector";
import { useBoard } from "./store";
import { sound } from "./sound";
import { Icon } from "./components/icons";

const KEY = "brain-board:v1";
function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ elements: s.elements, links: s.links }));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const mode = useBoard((s) => s.mode);
  const linkFrom = useBoard((s) => s.linkFromId);

  // sound enablement follows the store
  const soundOn = useBoard((s) => s.soundOn);
  useEffect(() => {
    sound.setEnabled(soundOn);
  }, [soundOn]);

  // autosave elements + links
  useEffect(() => {
    const unsub = useBoard.subscribe((s, prev) => {
      if (s.elements !== prev.elements || s.links !== prev.links) persist(s);
    });
    return unsub;
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const t = (e.target && e.target.tagName) || "";
      if (t === "INPUT" || t === "TEXTAREA") return;
      const b = useBoard.getState();
      switch (e.key) {
        case "n":
        case "N":
          b.addElement();
          sound.add();
          break;
        case "l":
        case "L":
          b.toggleMode();
          sound.toggle();
          break;
        case "Delete":
        case "Backspace":
          if (b.selectedId) {
            b.removeElement(b.selectedId);
            sound.remove();
          }
          break;
        case "Escape":
          if (b.mode === "link" && b.linkFromId) b.setMode("link");
          else b.select(null);
          break;
        case "f":
        case "F":
          if (b.selectedId) {
            b.focus(b.selectedId);
            sound.focus();
          }
          break;
        case "r":
        case "R":
          b.resetCamera();
          break;
        case "s":
        case "S":
          b.toggleSound();
          break;
        case "t":
        case "T":
          b.toggleTheme();
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Board />

      {/* link-mode banner */}
      {mode === "link" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none bb-fade">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-200 text-sm backdrop-blur-md">
            <Icon.Link />
            {linkFrom ? "Now click another idea to connect" : "Link mode — click two ideas to connect"}
            <button
              onClick={() => useBoard.getState().setMode("move")}
              className="ml-1 px-2 py-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 text-xs"
            >
              esc
            </button>
          </div>
        </div>
      )}

      <TopBar />
      <Inspector />
      <Toolbar />

      {/* shortcuts hint */}
      <div className="absolute left-4 bottom-6 pointer-events-none">
        <div className="bg-slate-900/50 backdrop-blur border border-white/10 rounded-xl px-3.5 py-2.5 text-[11px] text-slate-400 leading-relaxed">
          <div><b className="text-slate-200">N</b> new idea &nbsp; <b className="text-slate-200">L</b> link mode &nbsp; <b className="text-slate-200">R</b> reset view</div>
          <div className="mt-0.5"><b className="text-slate-200">Del</b> delete &nbsp; <b className="text-slate-200">F</b> focus &nbsp; double-click focuses</div>
          <div className="mt-0.5 text-slate-500">drag to move • right-drag orbit • scroll zoom</div>
        </div>
      </div>
    </div>
  );
}
