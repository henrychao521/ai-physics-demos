/* 3D 模擬頁共用：建立 three.js 場景＋自寫的軌道控制（滑鼠／單指拖曳旋轉、滾輪／雙指縮放、雙擊或雙點重設視角）。
   用法（ES module）：
     import * as THREE from '../assets/vendor/three/three.module.min.js';
     import { createView } from '../assets/orbit3d.js';
     const view = createView(THREE, document.getElementById('stage'), { aspect: 1.5, target: [0,0,0], distance: 9, theta: 0.8, phi: 1.1 });
     view.scene.add(...);  view.onFrame(dt => { ... });   // 每格呼叫，dt 單位秒
   - 畫布寬度跟著容器（container.clientWidth），高度＝寬／aspect；視窗 resize 時自動重算（App 的手機版釘住畫面會送 resize）。
   - 不支援 WebGL 時，容器內改顯示一段說明文字（不丟例外），view.ok=false。
   - 不使用任何外部網址。 */
export function createView(THREE, container, opts = {}) {
  const o = Object.assign({ aspect: 1.6, target: [0, 0, 0], distance: 10, theta: 0.7, phi: 1.15,
    minDistance: 2, maxDistance: 60, background: 0x0a0e17, fov: 45 }, opts);
  const view = { ok: false, THREE, container, frameFns: [] };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'webgl-fallback';
    p.textContent = '這個瀏覽器無法啟用 WebGL，3D 畫面無法顯示；下方的數值與公式面板仍可使用。';
    p.style.cssText = 'padding:24px;color:#8a99ad;text-align:center;margin:0';
    container.appendChild(p);
    view.onFrame = () => {}; view.render = () => {}; view.resetView = () => {};
    return view;
  }
  view.ok = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));   // 手機上限 2 倍，省電
  renderer.setClearColor(o.background, 1);
  const canvas = renderer.domElement;
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.touchAction = 'none';
  canvas.setAttribute('aria-label', '3D 模擬畫面：拖曳旋轉、雙指或滾輪縮放、雙擊重設視角');
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov, o.aspect, 0.05, 500);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a2233, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 10, 8); scene.add(sun);
  const target = new THREE.Vector3(...o.target);
  const home = { distance: o.distance, theta: o.theta, phi: o.phi };
  const sph = { r: o.distance, theta: o.theta, phi: o.phi };          // theta：繞 y 軸方位角；phi：與 +y 軸夾角
  function place() {
    sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, sph.phi));
    sph.r = Math.min(o.maxDistance, Math.max(o.minDistance, sph.r));
    const s = Math.sin(sph.phi);
    camera.position.set(target.x + sph.r * s * Math.sin(sph.theta), target.y + sph.r * Math.cos(sph.phi), target.z + sph.r * s * Math.cos(sph.theta));
    camera.lookAt(target);
  }
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, Math.round(w / o.aspect));
    renderer.setSize(w, h, false); canvas.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // ---- 軌道控制（Pointer Events，單指旋轉、雙指縮放）----
  const pts = new Map(); let pinch0 = 0, r0 = 0, lastTap = 0;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = sph.r; }
    const now = performance.now(); if (pts.size === 1 && now - lastTap < 300) view.resetView(); lastTap = now;
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1) {
      const k = 2 * Math.PI / Math.max(300, canvas.clientWidth);
      sph.theta -= (e.clientX - p.x) * k; sph.phi -= (e.clientY - p.y) * k;
    }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0 && d > 0) sph.r = r0 * pinch0 / d; }
    place();
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); sph.r *= Math.exp(e.deltaY * 0.0012); place(); }, { passive: false });
  view.resetView = () => { sph.r = home.distance; sph.theta = home.theta; sph.phi = home.phi; place(); };
  view.setView = (theta, phi, distance) => { if (theta != null) sph.theta = theta; if (phi != null) sph.phi = phi; if (distance != null) sph.r = distance; place(); };
  view.onFrame = fn => view.frameFns.push(fn);
  view.render = () => renderer.render(scene, camera);
  Object.assign(view, { renderer, scene, camera, canvas, target, sph });
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    for (const f of view.frameFns) f(dt, now / 1000);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  resize(); place(); requestAnimationFrame(loop);
  return view;
}
