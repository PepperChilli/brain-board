import { create } from "zustand";

const STORAGE_KEY = "brain-board:v1";

const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const TAGS = [
  { id: "idea", label: "Idea", color: "#22c55e" },
  { id: "question", label: "Question", color: "#f59e0b" },
  { id: "decision", label: "Decision", color: "#8b5cf6" },
  { id: "blocker", label: "Blocker", color: "#ef4444" },
  { id: "note", label: "Note", color: "#38bdf8" },
];

export const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.id, t]));

function seed() {
  const a = uid();
  const b = uid();
  const c = uid();
  return {
    elements: [
      { id: a, x: 0, y: 1.1, z: 0, title: "Welcome to BrainBoard", tag: "note", desc: "Drag me to move. Double-click to focus. Right-click-drag to orbit, scroll to zoom." },
      { id: b, x: -3.4, y: 2.0, z: -1.2, title: "What feels alive?", tag: "question", desc: "Feedback on every action. Motion. Glow." },
      { id: c, x: 3.4, y: 2.2, z: -1.4, title: "Ship a v1", tag: "decision", desc: "Capture, connect, revisit." },
    ],
    links: [
      { id: uid(), a, b },
      { id: uid(), a, c },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.elements) && Array.isArray(p.links)) return p;
    }
  } catch {
    /* ignore */
  }
  return seed();
}

export const useBoard = create((set, get) => ({
  ...load(),

  selectedId: null,
  linkFromId: null,
  mode: "move", // 'move' | 'link'
  filter: null, // null | tag id
  theme: "dark",
  soundOn: true,
  focusRequest: null, // { id, nonce }
  resetNonce: 0,

  // ---- elements ----
  addElement: (partial = {}) => {
    const id = uid();
    const el = {
      id,
      x: (Math.random() - 0.5) * 5,
      y: 1.4 + (Math.random() - 0.5) * 2.4,
      z: (Math.random() - 0.5) * 2,
      title: partial.title || "New idea",
      tag: partial.tag || "idea",
      desc: partial.desc || "",
    };
    set((s) => ({ elements: [...s.elements, el], selectedId: id, mode: "move" }));
    return id;
  },

  moveElement: (id, pos) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, x: pos.x, y: pos.y, z: pos.z } : e)),
    })),

  updateElement: (id, patch) =>
    set((s) => ({ elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      links: s.links.filter((l) => l.a !== id && l.b !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      linkFromId: s.linkFromId === id ? null : s.linkFromId,
    })),

  importBoard: (data) => {
    if (!data || !Array.isArray(data.elements) || !Array.isArray(data.links)) return;
    set({
      elements: data.elements,
      links: data.links,
      selectedId: null,
      linkFromId: null,
      filter: null,
    });
  },

  clearBoard: () => set({ elements: [], links: [], selectedId: null, linkFromId: null, filter: null }),

  // ---- selection / mode ----
  select: (id) => set({ selectedId: id }),
  setMode: (mode) => set({ mode, linkFromId: null }),
  toggleMode: () => set((s) => ({ mode: s.mode === "move" ? "link" : "move", linkFromId: null })),

  linkClick: (id) =>
    set((s) => {
      if (s.linkFromId == null) return { linkFromId: id };
      if (s.linkFromId === id) return { linkFromId: null };
      const dup = s.links.some(
        (l) => (l.a === s.linkFromId && l.b === id) || (l.a === id && l.b === s.linkFromId)
      );
      if (dup) return { linkFromId: null };
      return {
        links: [...s.links, { id: uid(), a: s.linkFromId, b: id }],
        linkFromId: null,
      };
    }),

  removeLink: (id) => set((s) => ({ links: s.links.filter((l) => l.id !== id) })),

  // ---- camera ----
  focus: (id) => set({ selectedId: id, focusRequest: { id, nonce: Date.now() } }),
  resetCamera: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),

  // ---- prefs ----
  setFilter: (tag) => set({ filter: get().filter === tag ? null : tag }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
