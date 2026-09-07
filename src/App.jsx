import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useStore } from './store';

const TAG_COLORS = {
  idea: { hex: 0x22c55e },
  question: { hex: 0xf97316 },
  decision: { hex: 0x8b5cf6 },
  note: { hex: 0x38bdf8 },
};

function App() {
  const mountRef = useRef(null);
  const [showTagPalette, setShowTagPalette] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 5000);
    camera.position.set(15, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const sceneMeshes = new Map();

    const updateElements = useCallback(() => {
      elements.forEach((el) => {
        const existing = sceneMeshes.get(el.id);
        const tagColors = TAG_COLORS[el.tag] || TAG_COLORS.note;

        if (!existing.mesh) {
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshStandardMaterial({ color: tagColors.hex });
          const mesh = new THREE.Mesh(geometry, material);
          const pivot = new THREE.Object3D();
          pivot.add(mesh);
          mesh.position.set(el.x, el.y, el.z);
          scene.add(pivot);
          sceneMeshes.set(el.id, { mesh, pivot });
        } else {
          const { mesh } = existing;
          mesh.material.color.setHex(tagColors.hex);
          mesh.position.set(el.x, el.y, el.z);
        }
      });

      sceneMeshes.forEach((val, id) => {
        if (!elements.find((e) => e.id === id)) {
          scene.remove(val.pivot);
          val.pivot.traverse((obj) => {
            obj.geometry?.dispose();
            obj.material?.dispose();
          });
          val.pivot.clear();
          val.pivot.dispose();
          sceneMeshes.delete(id);
        }
      });
    }, [elements]);

    updateElements();

    const onMouseDown = (e) => {
      e.preventDefault();
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const vector = new THREE.Vector2(x, y);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(vector, camera);
      const intersects = ray.intersectObjects(scene.children.flat(), true);

      if (intersects.length > 0) {
        const pivot = intersects[0].object.parent.parent;
        const id = Array.from(sceneMeshes.keys()).find((k) => sceneMeshes.get(k).pivot === pivot);
        if (id) {
          useStore.getState().selectElement(id);
          setContextMenu({ x: e.clientX, y: e.clientY, open: true });
        }
      } else {
        useStore.getState().deselectElement();
        setContextMenu(null);
      }
    };

    const onMouseUp = () => {
      useStore.getState().isDragging && setDragging(false);
      setContextMenu(null);
    };

    let dragging = false;

    const onMouseDownDrag = (e) => {
      e.preventDefault();
      dragging = true;
      useStore.getState().setIsDragging(true);
    };

    const onDrag = (e) => {
      if (!dragging && !isDragging) return;
      e.preventDefault();
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const vector = new THREE.Vector2(x, y);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(vector, camera);
      const intersects = ray.intersectObjects(scene.children.flat(), true);

      if (intersects.length > 0) {
        const pivot = intersects[0].object.parent.parent;
        const { mesh } = intersects[0];
        const id = Array.from(sceneMeshes.keys()).find((k) => sceneMeshes.get(k).mesh === mesh);
        if (id) {
          useStore.getState().setElementPosition(id, {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('pointerup', onMouseUp);
    renderer.domElement.addEventListener('pointerdown', onMouseDownDrag);

    window.addEventListener('resize', () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    });

    const animate = useCallback(() => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }, []);

    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('pointerup', onMouseUp);
      renderer.domElement.removeEventListener('pointerdown', onMouseDownDrag);
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [camera]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {showTagPalette && (
        <div className="absolute top-20 right-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-2 flex gap-2">
          {Object.entries(TAG_COLORS).map(([tag, { hex }]) => (
            <button key={tag} onClick={() => { if (selectedElementId) useStore.getState().setElements(elements.map(e => e.id === selectedElementId ? { ...e, tag } : e)); setShowTagPalette(false); }}
              className="w-8 h-8 rounded-lg" style={{ backgroundColor: hex }} title={tag} />
          ))}
        </div>
      )}

      {contextMenu && (
        <div className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-2 min-w-[160px]" style={{ left: contextMenu.x, top: contextMenu.y, transform: 'translate(-50%, -50%)' }}>
          <div className="flex flex-col gap-1">
            <button onClick={() => { setShowTagPalette(true); setContextMenu(null); }} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sm">Edit Tag</button>
            <button onClick={() => { if (selectedElementId) { deleteElement(selectedElementId); useStore.getState().deselectElement(); } setContextMenu(null); }} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-sm">Delete</button>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
        <button onClick={() => addElement({ x: 0, y: 0, z: 0, tag: 'note' })} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl">New</button>
        <div className="w-px h-8 bg-slate-700/50" />
        <button onClick={() => setShowTagPalette(!showTagPalette)} className={'px-4 py-2 rounded-xl ' + (showTagPalette ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300')}>Tag</button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        <label className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"><span>Import</span><input type="file" accept=".json" onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (Array.isArray(data)) setElements(data); } catch {} }; reader.readAsText(file); }} className="hidden" /></label>
      </div>
    </div>
  );
}

export default App;
