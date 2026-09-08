import { useBoard, TAGS, TAG_MAP } from "../store";
import { sound } from "../sound";
import { Icon } from "./icons";

export default function Inspector() {
  const selectedId = useBoard((s) => s.selectedId);
  const elements = useBoard((s) => s.elements);
  const links = useBoard((s) => s.links);
  const el = elements.find((e) => e.id === selectedId);

  if (!el) return null;

  const conns = links.filter((l) => l.a === el.id || l.b === el.id);
  const other = (l) => elements.find((e) => e.id === (l.a === el.id ? l.b : l.a));
  const set = (patch) => useBoard.getState().updateElement(el.id, patch);

  return (
    <div
      key={el.id}
      className="absolute right-4 top-[64px] bottom-28 w-[280px] pointer-events-auto bb-slide-in flex flex-col bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TAG_MAP[el.tag].color }} />
          INSPECTOR
        </div>
        <button onClick={() => useBoard.getState().select(null)} className="text-slate-400 hover:text-white">
          <Icon.Close />
        </button>
      </div>

      <div className="px-4 flex-1 overflow-y-auto bb-scroll space-y-4">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-slate-500">Title</label>
          <input
            defaultValue={el.title}
            onChange={(e) => set({ title: e.target.value })}
            className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wide text-slate-500">Tag</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const active = el.tag === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { set({ tag: t.id }); sound.toggle(); }}
                  className={"flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition " + (active ? "text-white" : "text-slate-400 hover:text-white")}
                  style={active ? { backgroundColor: t.color + "26", boxShadow: `inset 0 0 0 1px ${t.color}88` } : { backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wide text-slate-500">Notes</label>
          <textarea
            defaultValue={el.desc || ""}
            onChange={(e) => set({ desc: e.target.value })}
            rows={3}
            className="mt-1 w-full resize-none bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wide text-slate-500">
            Connections <span className="text-slate-600">({conns.length})</span>
          </label>
          <div className="mt-1.5 space-y-1">
            {conns.length === 0 && <div className="text-xs text-slate-500">No links yet. Use Link mode.</div>}
            {conns.map((l) => {
              const o = other(l);
              return (
                <div key={l.id} className="flex items-center justify-between bg-black/25 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-200 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o ? TAG_MAP[o.tag].color : "#64748b" }} />
                    <span className="truncate">{o ? o.title : "missing"}</span>
                  </div>
                  <button onClick={() => { useBoard.getState().removeLink(l.id); sound.remove(); }} className="text-slate-500 hover:text-red-300 shrink-0">
                    <Icon.Close />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex gap-2">
          <span>x {el.x.toFixed(1)}</span>
          <span>y {el.y.toFixed(1)}</span>
          <span>z {el.z.toFixed(1)}</span>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => { useBoard.getState().focus(el.id); sound.focus(); }}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-500/90 hover:bg-sky-500 text-white text-sm font-medium"
        >
          <Icon.Target /> Focus
        </button>
        <button
          onClick={() => { useBoard.getState().removeElement(el.id); sound.remove(); }}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-medium"
        >
          <Icon.Trash /> Delete
        </button>
      </div>
    </div>
  );
}
