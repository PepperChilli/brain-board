import { create } from 'zustand';

export const useStore = create((set, get) => ({
  elements: [],
  selectedElementId: null,
  cameraPos: { x: 15, y: 15, z: 20 },
  isDragging: false,

  addElement: (pos = { x: 0, y: 0, z: 0 }, overrides = {}) =>
    set((state) => ({
      elements: [...state.elements, {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        ...pos,
        title: overrides.title || 'New Idea',
        description: overrides.description || '',
        tag: overrides.tag || 'note',
      }],
    })),

  setElementPosition: (id, pos) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, ...pos } : e
      ),
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((e) => e.id !== id),
    })),

  setElements: (elements) => set({ elements }),

  selectElement: (id) => set({ selectedElementId: id }),
  deselectElement: () => set({ selectedElementId: null }),

  setIsDragging: (isDragging) => set({ isDragging }),
}));
