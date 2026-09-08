import { useBoard, TAGS } from "../store";
import { sound } from "../sound";
import { Icon } from "./icons";

export default function TopBar() {
  const elements = useBoard((s) => s.elements);
  const links = useBoard((s) => s.links);
  const filter = useBoard((s) => s.filter);
  const theme = useBoard((s) => s.theme);
  const soundOn = useBoard((s) => s.soundOn);

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-5 py-3 pointer-events-none select-none">
      {/* brand + stats */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2 shadow-xl">
          <div className="grid grid-cols-2 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          </div>
          <div className="leading-none">
            <div className="font-semibold tracking-tight text-[15px] text-white">BrainBoard</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">3D idea studio</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/40 backdrop-blur border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300">
          <span><b className="text-white">{elements.length}</b> ideas</span>
          <span className="text-slate-600">•</span>
          <span><b className="text-white">{links.length}</b> links</span>
        </div>
      </div>

      {/* filter chips */}
      <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/40 backdrop-blur border border-white/10 rounded-xl px-2 py-1.5">
        <button
          onClick={() => useBoard.setState({ filter: null })}
          className={"px-2.5 py-1 rounded-lg text-xs font-medium transition " + (filter === null ? "bg-white/15 text-white" : "text-slate-400 hover:text-white")}
        >
          All
        </button>
        {TAGS.map((t) => {
          const active = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => useBoard.getState().setFilter(t.id)}
              className={"flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition " + (active ? "text-white" : "text-slate-400 hover:text-white")}
              style={active ? { backgroundColor: t.color + "26", boxShadow: `inset 0 0 0 1px ${t.color}66` } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* prefs */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => useBoard.getState().toggleSound()}
          title={soundOn ? "Sound on (S)" : "Sound muted (S)"}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur border border-white/10 text-slate-300 hover:text-white transition"
          style={{ opacity: soundOn ? 1 : 0.4 }}
        >
          <Icon.Sparkle />
        </button>
        <button
          onClick={() => { useBoard.getState().toggleTheme(); sound.toggle(); }}
          title="Toggle theme (T)"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur border border-white/10 text-slate-300 hover:text-white transition"
        >
          {theme === "dark" ? <Icon.Sun /> : <Icon.Moon />}
        </button>
      </div>
    </div>
  );
}
