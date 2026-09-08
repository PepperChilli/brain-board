import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useBoard, TAG_MAP } from "./store";
import { makeCardTexture, CARD_W, CARD_H } from "./cardTexture";
import { sound } from "./sound";

const HOME = { pos: new THREE.Vector3(0, 3.4, 13), target: new THREE.Vector3(0, 1.4, 0) };
const LSEG = 24;

function tagColor(tag) {
  return (TAG_MAP[tag] && TAG_MAP[tag].color) || "#38bdf8";
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.4, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function contentKey(el) {
  return el.title + "" + el.tag + "" + (el.desc || "");
}

export default function Board() {
  const ref = useRef(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const canvas = renderer.domElement;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 400);
    camera.position.copy(HOME.pos);

    const glowTex = makeGlowTexture();
    const S = {
      meshes: new Map(),
      linkObjs: new Map(),
      pickMeshes: [],
      drag: null,
      hoverId: null,
      focusAnim: null,
      lastFocusNonce: 0,
      lastResetNonce: 0,
      clock: new THREE.Clock(),
      raycaster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
    };

    // ---- lights ----
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 12, 8);
    const rim = new THREE.PointLight(0x6366f1, 0.9, 70);
    rim.position.set(-8, 6, -8);
    scene.add(ambient, key, rim);

    // ---- particles ----
    const P = 520;
    const pos = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = Math.random() * 12 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ---- floor grid ----
    const grid = new THREE.GridHelper(60, 60, 0x3b4a63, 0x1b2436);
    grid.position.y = -2.4;
    grid.material.transparent = true;
    grid.material.opacity = 0.08;
    scene.add(grid);

    function applyTheme() {
      const light = useBoard.getState().theme === "light";
      scene.background = new THREE.Color(light ? 0xdbe4f0 : 0x05070f);
      scene.fog = new THREE.FogExp2(light ? 0xdbe4f0 : 0x05070f, 0.02);
      ambient.intensity = light ? 0.95 : 0.55;
      key.intensity = light ? 1.0 : 0.9;
      rim.color.set(light ? 0x60a5fa : 0x6366f1);
      pMat.color.set(light ? 0x475569 : 0x60a5fa);
      grid.material.opacity = light ? 0.14 : 0.08;
    }
    applyTheme();

    // ---- controls ----
    let controls = null;
    const setEnabled = (v) => controls && (controls.enabled = v);

    const getNDC = (e) => {
      const r = canvas.getBoundingClientRect();
      S.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      S.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const pick = () => {
      S.raycaster.setFromCamera(S.ndc, camera);
      const hits = S.raycaster.intersectObjects(S.pickMeshes, false);
      return hits.length ? hits[0] : null;
    };
    const idOf = (obj) => {
      let o = obj;
      while (o) {
        if (o.userData && o.userData.id) return o.userData.id;
        o = o.parent;
      }
      return null;
    };

    // register our listeners BEFORE OrbitControls so card-drags win
    function onPointerDown(e) {
      if (e.button !== 0) return;
      getNDC(e);
      const board = useBoard.getState();
      const hit = pick();
      if (hit) {
        const id = idOf(hit.object);
        if (id) {
          board.select(id);
          sound.select();
          if (board.mode === "link") board.linkClick(id);
          else {
            const m = S.meshes.get(id);
            const camDir = camera.getWorldDirection(new THREE.Vector3());
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, m.group.position);
            S.drag = { id, plane, offset: m.group.position.clone().sub(hit.point), moved: false, last: null };
            setEnabled(false);
            canvas.style.cursor = "grabbing";
            sound.drag();
          }
          return;
        }
      }
      if (board.mode === "link" && board.linkFromId) board.setMode("link");
      else if (board.mode === "move") board.select(null);
    }

    function onPointerMove(e) {
      getNDC(e);
      const board = useBoard.getState();
      if (S.drag) {
        const m = S.meshes.get(S.drag.id);
        if (!m) return;
        S.raycaster.setFromCamera(S.ndc, camera);
        const pt = new THREE.Vector3();
        if (S.raycaster.ray.intersectPlane(S.drag.plane, pt)) {
          pt.add(S.drag.offset);
          pt.x = THREE.MathUtils.clamp(pt.x, -16, 16);
          pt.y = THREE.MathUtils.clamp(pt.y, -1, 9);
          pt.z = THREE.MathUtils.clamp(pt.z, -16, 16);
          if (!S.drag.last || S.drag.last.distanceTo(pt) > 0.03) {
            m.group.position.copy(pt);
            S.drag.last = pt.clone();
            S.drag.moved = true;
            board.moveElement(S.drag.id, { x: pt.x, y: pt.y, z: pt.z });
          }
        }
      } else {
        const hit = pick();
        const id = hit ? idOf(hit.object) : null;
        if (id !== S.hoverId) {
          S.hoverId = id;
          canvas.style.cursor = id ? "grab" : "";
        }
      }
    }

    function onPointerUp() {
      if (S.drag) {
        const board = useBoard.getState();
        const m = S.meshes.get(S.drag.id);
        if (S.drag.moved && m) board.moveElement(S.drag.id, { x: m.group.position.x, y: m.group.position.y, z: m.group.position.z });
        S.drag = null;
      }
      setEnabled(true);
      canvas.style.cursor = S.hoverId ? "grab" : "";
    }

    function onDblClick(e) {
      getNDC(e);
      const hit = pick();
      if (hit) {
        const id = idOf(hit.object);
        if (id) {
          useBoard.getState().focus(id);
          sound.focus();
        }
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("dblclick", onDblClick);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.target.copy(HOME.target);
    controls.update();

    // ---- cards ----
    function createCard(el) {
      const group = new THREE.Object3D();
      group.position.set(el.x, el.y, el.z);
      group.userData.id = el.id;
      const inner = new THREE.Object3D();
      group.add(inner);

      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W * 1.9, CARD_H * 2.1),
        new THREE.MeshBasicMaterial({ map: glowTex, color: tagColor(el.tag), transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      glow.position.z = -0.05;
      inner.add(glow);

      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshBasicMaterial({ map: makeCardTexture(el), transparent: true, side: THREE.DoubleSide })
      );
      inner.add(card);

      const w = CARD_W / 2 - 0.06;
      const h = CARD_H / 2 - 0.06;
      const pts = [
        [-w, -h], [w, -h], [w, h], [-w, h],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0.012));
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
      outline.visible = false;
      inner.add(outline);

      scene.add(group);
      const m = {
        id: el.id, group, inner, card, glow, outline,
        tex: card.material.map, tag: el.tag, contentHash: contentKey(el),
        phase: Math.random() * Math.PI * 2,
        scale: 1, glowOp: 0.06, targetScale: 1, targetGlow: 0.06, dim: false,
      };
      S.meshes.set(el.id, m);
      S.pickMeshes.push(card);
      return m;
    }

    function disposeCard(m) {
      scene.remove(m.group);
      m.tex.dispose();
      m.card.material.dispose();
      m.card.geometry.dispose();
      m.glow.geometry.dispose();
      m.glow.material.dispose();
      m.outline.geometry.dispose();
      m.outline.material.dispose();
      S.pickMeshes = S.pickMeshes.filter((x) => x !== m.card);
    }

    function syncElements() {
      const board = useBoard.getState();
      const seen = new Set();
      for (const el of board.elements) {
        seen.add(el.id);
        let m = S.meshes.get(el.id);
        if (!m) m = createCard(el);

        if (m.contentHash !== contentKey(el)) {
          m.tex.dispose();
          const nt = makeCardTexture(el, board.selectedId === el.id);
          m.card.material.map = nt;
          m.tex = nt;
          m.contentHash = contentKey(el);
        }
        m.tag = el.tag;
        m.glow.material.color.set(tagColor(el.tag));

        const sel = board.selectedId === el.id;
        const linkFrom = board.mode === "link" && board.linkFromId === el.id;
        m.outline.visible = sel || linkFrom || board.mode === "link";
        m.outline.material.color.set(linkFrom ? "#fde047" : tagColor(el.tag));
        m.outline.material.opacity = linkFrom ? 1 : sel ? 0.95 : 0.28;

        m.dim = !!board.filter && el.tag !== board.filter;
        if (!(S.drag && S.drag.id === el.id)) m.group.position.set(el.x, el.y, el.z);
      }
      for (const [id, m] of S.meshes) if (!seen.has(id)) { disposeCard(m); S.meshes.delete(id); }
    }

    // ---- links ----
    function ensureLink(id) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array((LSEG + 1) * 3), 3));
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      line.frustumCulled = false;
      scene.add(line);
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      scene.add(pulse);
      const o = { id, curve, line, pulse, geom, phase: Math.random(), _a: null, _b: null };
      S.linkObjs.set(id, o);
      return o;
    }

    function syncLinks() {
      const board = useBoard.getState();
      const tagById = {};
      for (const el of board.elements) tagById[el.id] = el.tag;
      const seen = new Set();
      for (const link of board.links) {
        seen.add(link.id);
        let o = S.linkObjs.get(link.id);
        if (!o) o = ensureLink(link.id);
        o.line.material.color.set(tagColor(tagById[link.a] || "note"));
      }
      for (const [id, o] of S.linkObjs) if (!seen.has(id)) {
        scene.remove(o.line);
        scene.remove(o.pulse);
        o.line.geometry.dispose();
        o.line.material.dispose();
        o.pulse.geometry.dispose();
        o.pulse.material.dispose();
        S.linkObjs.delete(id);
      }
    }

    // ---- camera triggers ----
    function handleTriggers() {
      const board = useBoard.getState();
      if (board.focusRequest && board.focusRequest.nonce !== S.lastFocusNonce) {
        S.lastFocusNonce = board.focusRequest.nonce;
        const m = S.meshes.get(board.focusRequest.id);
        if (m) {
          const target = m.group.position.clone();
          const dir = camera.position.clone().sub(target);
          if (dir.lengthSq() < 0.001) dir.set(0, 0.3, 1);
          dir.normalize();
          S.focusAnim = { t: 0, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), toPos: target.clone().add(dir.multiplyScalar(6.5)), toTgt: target.clone() };
          setEnabled(false);
        }
      }
      if (board.resetNonce !== S.lastResetNonce) {
        S.lastResetNonce = board.resetNonce;
        S.focusAnim = { t: 0, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), toPos: HOME.pos.clone(), toTgt: HOME.target.clone() };
        setEnabled(false);
      }
    }

    let prevTheme = useBoard.getState().theme;
    let prevFocus = useBoard.getState().focusRequest;
    let prevReset = useBoard.getState().resetNonce;
    function onStore() {
      syncElements();
      syncLinks();
      const th = useBoard.getState().theme;
      if (th !== prevTheme) { applyTheme(); prevTheme = th; }
      const fr = useBoard.getState().focusRequest;
      if (fr !== prevFocus) { prevFocus = fr; handleTriggers(); }
      const rn = useBoard.getState().resetNonce;
      if (rn !== prevReset) { prevReset = rn; handleTriggers(); }
    }
    const unsub = useBoard.subscribe(onStore);
    syncElements();
    syncLinks();
    handleTriggers();

    // ---- animation ----
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function tick() {
      const t = S.clock.getElapsedTime();
      if (S.focusAnim) {
        const f = S.focusAnim;
        f.t = Math.min(1, f.t + 0.035);
        const e = easeOut(f.t);
        camera.position.lerpVectors(f.fromPos, f.toPos, e);
        controls.target.lerpVectors(f.fromTgt, f.toTgt, e);
        if (f.t >= 1) { S.focusAnim = null; setEnabled(true); }
      }
      controls.update();

      const board = useBoard.getState();
      for (const m of S.meshes.values()) {
        const isSel = board.selectedId === m.id;
        const isHover = S.hoverId === m.id;
        const isDrag = S.drag && S.drag.id === m.id;
        let ts = 1, tg = 0.06 + Math.sin(t * 1.5 + m.phase) * 0.03;
        if (isHover) { ts = Math.max(ts, 1.06); tg = Math.max(tg, 0.28); }
        if (isSel) { ts = Math.max(ts, 1.05); tg = Math.max(tg, 0.4); }
        if (isDrag) { ts = Math.max(ts, 1.1); tg = Math.max(tg, 0.5); }
        m.targetScale = ts;
        m.targetGlow = tg;
        m.scale += (m.targetScale - m.scale) * 0.18;
        m.glowOp += (m.targetGlow - m.glowOp) * 0.18;
        m.inner.scale.setScalar(m.scale);
        m.inner.position.y = Math.sin(t * 0.9 + m.phase) * 0.05;
        m.inner.quaternion.copy(camera.quaternion);
        const dim = m.dim ? 0.32 : 1;
        m.card.material.opacity = dim;
        m.glow.material.opacity = m.glowOp * dim;
        m.outline.material.opacity *= 1; // keep set value
        if (m.dim) m.outline.material.opacity = 0.15;
      }

      // links
      for (const o of S.linkObjs.values()) {
        const link = o.id;
        const boardLinks = board.links;
        // find endpoints
        let a = null, b = null;
        for (const l of boardLinks) {
          if (l.id === link) { a = l.a; b = l.b; break; }
        }
        if (!a || !b) continue;
        const ma = S.meshes.get(a);
        const mb = S.meshes.get(b);
        if (!ma || !mb) continue;
        const p0 = ma.group.position, p1 = mb.group.position;
        const mid = p0.clone().add(p1).multiplyScalar(0.5);
        mid.y += 0.3 + p0.distanceTo(p1) * 0.06;
        o.curve.v0.copy(p0);
        o.curve.v1.copy(mid);
        o.curve.v2.copy(p1);
        const pts = o.curve.getPoints(LSEG);
        const attr = o.geom.getAttribute("position");
        for (let i = 0; i <= LSEG; i++) attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        attr.needsUpdate = true;
        const u = (t * 0.35 + o.phase) % 1;
        o.pulse.position.copy(o.curve.getPoint(u));
      }

      particles.rotation.y += 0.0004;
      renderer.render(scene, camera);
    }

    (function animate() {
      requestAnimationFrame(animate);
      tick();
    })();

    function onResize() {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    window.__board = {
      get state() { return useBoard.getState(); },
      scene,
      camera,
      cardCount: () => S.meshes.size,
    };

    return () => {
      unsub();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("dblclick", onDblClick);
      if (controls) controls.dispose();
      for (const m of S.meshes.values()) disposeCard(m);
      for (const o of S.linkObjs.values()) {
        o.line.geometry.dispose(); o.line.material.dispose();
        o.pulse.geometry.dispose(); o.pulse.material.dispose();
      }
      pGeo.dispose(); pMat.dispose(); glowTex.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      if (window.__board) delete window.__board;
    };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
