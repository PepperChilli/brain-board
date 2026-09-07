import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useStore } from './store';

const TAG_COLORS = {
  idea:    { hex: 0x22c55e, glow: 'rgba(34,197,94,0.6)' },
  question: { hex: 0xf97316, glow: 'rgba(249,115,22,0.6)' },
  decision: { hex: 0x8b5cf6, glow: 'rgba(139,92,246,0.6)' },
  note:    { hex: 0x38bdf8, glow: 'rgba(56,189,248,0.6)' },
};

function App() {
  const mountRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showTagPalette, setShowTagPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [activeTool, setActiveTool] = useState(null);

  const { elements, selectedElementId, addElement, deleteElement, setElements, setIsDragging } = useStore();

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = theme === 'dark' ? new THREE.Color(0x020617) : new THREE.Color(0xe5e7eb);
    scene.fog = theme === 'dark' ? new THREE.FogExp2(0x020617, 0.025) : new THREE.FogExp2(0xe5e7eb, 0.02);

    const camera = new THREE.PerspectiveCamera(55, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 5000);
    camera.position.set(15, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

    const ambient = new THREE.AmbientLight(0x334155, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xf0f9ff, 0.9);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.4);
    fillLight.position.set(-10, 5, -15);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0x6366f1, 0.6);
    rimLight.position.set(0, 20, -20);
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 1;
    scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x8b5cf6, 0.5, 50);
    pointLight1.position.set(-30, 10, -20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x22c55e, 0.5, 50);
    pointLight2.position.set(30, -10, 20);
    scene.add(pointLight2);

    const elementMeshes = new Map();

    const updateElements = useCallback(() => {
      const now = Date.now();
      elements.forEach((el) => {
        const existing = elementMeshes.get(el.id);
        const tagColors = TAG_COLORS[el.tag] || TAG_COLORS.note;

        if (!existing.mesh) {
          const size = 1 + Math.random() * 0.6;
          const geometry = new THREE.BoxGeometry(size, size * 1.2, size);
          const material = new THREE.MeshStandardMaterial({
            color: tagColors.hex,
            roughness: 0.25 + Math.random() * 0.15,
            metalness: 0.35 + Math.random() * 0.25,
            emissive: tagColors.hex,
            emissiveIntensity: 0.05 + Math.random() * 0.05,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const floatPhase = Math.random() * Math.PI * 2;

          const pivot = new THREE.Object3D();
          pivot.add(mesh);
          mesh.position.set(el.x, el.y, el.z);

          const auraGeo = new THREE.SphereGeometry(size * 1.4, 12, 12);
          const auraMat = new THREE.MeshBasicMaterial({
            color: tagColors.hex,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
          });
          const aura = new THREE.Mesh(auraGeo, auraMat);
          mesh.add(aura);

          scene.add(pivot);
          elementMeshes.set(el.id, { mesh, pivot, geometry, material, floatPhase });
        } else {
          const { mesh, floatPhase } = existing;
          mesh.position.set(el.x, el.y, el.z);
          const aura = mesh.children[0];
          aura.material.color.setHex(tagColors.hex);
        }

        if (existing.mesh.children.length > 0) {
          const aura = existing.mesh.children[0];
          aura.scale.setScalar(1 + Math.sin(now * 0.002 + existing.floatPhase) * 0.1);
        }
      });

      elementMeshes.forEach((val, id) => {
        if (!elements.find((e) => e.id === id)) {
          const mesh = val.mesh;
          const aura = mesh.children[0];
          scene.remove(mesh);
          val.pivot.traverse((obj) => {
            obj.geometry?.dispose();
            obj.material?.dispose();
          });
          val.pivot.clear();
          val.pivot.dispose();
          elementMeshes.delete(id);
        }
      });
    }, [elements]);

    const prevCameraPos = useRef(camera.position.clone());
    let cameraDamping = 0.12;

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
        const id = Array.from(elementMeshes.keys()).find((k) => elementMeshes.get(k).pivot === pivot);
        if (id) {
          useStore.getState().selectElement(id);
          setContextMenu({ x: e.clientX, y: e.clientY, open: true });
        }
      } else {
        useStore.getState().deselectElement();
        setContextMenu(null);
        setActiveTool(null);
      }
    };

    const onMouseMove = (e) => {
      if (isDragging) return;
      const newCameraPos = camera.position.clone();
      newCameraPos.lerp(prevCameraPos.current, cameraDamping);
      camera.position.copy(newCameraPos);
      prevCameraPos.current.copy(newCameraPos);

      if (contextMenu?.open && e.buttons === 1) {
        setContextMenu({ x: e.clientX, y: e.clientY, open: true });
      }
    };

    const onRightMouseDown = (e) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, open: true });
    };

    const onMouseUp = () => {
      useStore.getState().isDragging && setDragging(false);
      setContextMenu(null);
    };

    let dragging = false;

    const onMouseDownDrag = (e) => {
      e.preventDefault();
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const vector = new THREE.Vector2(x, y);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(vector, camera);
      const intersects = ray.intersectObjects(scene.children.flat(), true);

      if (intersects.length === 0) {
        dragging = true;
        useStore.getState().setIsDragging(true);
      }
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
        const id = Array.from(elementMeshes.keys()).find((k) => elementMeshes.get(k).mesh === mesh);
        if (id) {
          useStore.getState().setElementPosition(id, {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          });
        }
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const newZoom = cameraControls.zoomFactor - e.deltaY * 0.001;
      setCameraControls(prev => ({ ...prev, zoomFactor: Math.max(0.3, Math.min(2.5, newZoom)) }));
    };

    const animate = useCallback(() => {
      requestAnimationFrame(animate);
      const now = Date.now() * 0.001;

      elementMeshes.forEach(({ mesh, floatPhase }) => {
        if (mesh.children.length > 0) {
          const aura = mesh.children[0];
          const floatOffset = Math.sin(now * 0.002 + floatPhase) * (0.08 * cameraControls.zoomFactor);
          aura.scale.setScalar(1 + floatOffset);
        }
      });

      if (!isDragging) {
        const driftSpeed = 0.0003 * cameraControls.zoomFactor;
        camera.position.x += Math.sin(now * 0.001) * driftSpeed;
        camera.position.y += Math.cos(now * 0.001) * driftSpeed;
      }

      renderer.render(scene, camera);
    }, [cameraControls, isDragging]);

    animate();

    renderer.domElement.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('pointermove', onMouseMove);
    renderer.domElement.addEventListener('contextmenu', onRightMouseDown);
    renderer.domElement.addEventListener('pointerup', onMouseUp);
    renderer.domElement.addEventListener('pointerdown', onMouseDownDrag);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    window.threeScene = { scene, camera, renderer, elementMeshes };

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('pointermove', onMouseMove);
      renderer.domElement.removeEventListener('contextmenu', onRightMouseDown);
      renderer.domElement.removeEventListener('pointerup', onMouseUp);
      renderer.domElement.removeEventListener('pointerdown', onMouseDownDrag);
      renderer.domElement.removeEventListener('wheel', handleWheel);

      if (window.threeScene) {
        delete window.threeScene.scene;
        delete window.threeScene.camera;
        delete window.threeScene.renderer;
        delete window.threeScene.elementMeshes;
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      scene.traverse((obj) => {
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
    };
  }, [cameraControls, isDragging]);

  const handleAddElement = () => {
    addElement({ x: 0, y: 0, z: 0, tag: 'note', title: 'New Idea', description: 'Type your idea here...' });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {showTagPalette && (
        <div className="absolute top-20 right-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-2 shadow-2xl flex gap-2">
          {Object.entries(TAG_COLORS).map(([tag, { hex, glow }]) => (
            <button key={tag} onClick={() => { if (selectedElementId) { useStore.getState().setElements(elements.map(e => e.id === selectedElementId ? { ...e, tag } : e)); } setShowTagPalette(false); }}
              className="w-8 h-8 rounded-lg transition-transform hover:scale-110" style={{ backgroundColor: hex, boxShadow: `0 0 15px ${glow}` }} title={tag} />
          ))}
        </div>
      )}

      {contextMenu && (
        <div className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-2 shadow-2xl min-w-[160px]" style={{ left: contextMenu.x, top: contextMenu.y, transform: 'translate(-50%, -50%)' }}>
          <div className="flex flex-col gap-1">
            <button onClick={() => { setShowTagPalette(true); setContextMenu(null); }} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Edit Tag</button>
            <button onClick={() => { if (selectedElementId) { deleteElement(selectedElementId); useStore.getState().deselectElement(); } setContextMenu(null); }} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm">Delete</button>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="absolute top-20 right-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 w-64">
          <h3 className="text-sm font-semibold">Shortcuts</h3>
          <ul className="text-xs space-y-1"><li>ESC — Deselect / Close menu</li><li>DELETE — Delete selected</li><li>RIGHT CLICK — Context menu</li><li>DRAG — Move elements</li></ul>
          <button onClick={() => setShowShortcuts(false)} className="mt-3 w-full py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded">Close</button>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
        <button onClick={handleAddElement} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl">New Idea</button>
        <div className="w-px h-8 bg-slate-700/50" />
        <button onClick={() => setShowTagPalette(!showTagPalette)} className={'px-4 py-2 rounded-xl ' + (showTagPalette ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300')}>Tag</button>
        <button onClick={() => setShowShortcuts(!showShortcuts)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Shortcuts</button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        <button onClick={() => { const data = JSON.stringify(elements, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `board-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Export</button>
        <label className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"><span>Import</span><input type="file" accept=".json" onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (Array.isArray(data)) setElements(data); } catch {} }; reader.readAsText(file); }} className="hidden" /></label>
      </div>

      <div className="absolute top-4 left-4 opacity-0 transition-opacity duration-700" style={{ transitionDelay: '2s' }}>
        <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-slate-400"><span>{elements.length} Elements</span></div>
      </div>
    </div>
  );
}

export default App;