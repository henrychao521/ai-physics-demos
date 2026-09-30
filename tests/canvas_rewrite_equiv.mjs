// R09 等價對帳：hovercraft／spectral-lab 舊版（React/Plotly，commit 868a227）vs 新版（純 Canvas）
// 用法：node tests/canvas_rewrite_equiv.mjs   （需在 repo 內執行，舊版由 git show 取得）
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const OLD = '868a227';
const root = execSync('git rev-parse --show-toplevel').toString().trim();
const oldSrc = p => execSync(`git -C "${root}" show ${OLD}:${p}`).toString();
const newSrc = p => readFileSync(`${root}/${p}`, 'utf8');
const phys = src => src.split('/*PHYS:BEGIN*/')[1].split('/*PHYS:END*/')[0];
let fails = 0, checks = 0;
const eq = (a, b, what) => { checks++;
  const ok = (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 1e-6 : a === b;
  if (!ok) { fails++; if (fails < 20) console.log('  ✗', what, 'old=', a, 'new=', b); } return ok; };

// ---------- hovercraft ----------
{
  const o = oldSrc('hovercraft/index.html');
  const dbTxt = o.match(/const hardwareDB = (\{[\s\S]*?\n  \});/)[1];
  const memo = o.match(/useMemo\(\(\) => \{([\s\S]*?)\}, \[liftMotor/)[1];
  const oldDB = new Function(`return ${dbTxt}`)();
  const oldPhys = new Function('liftMotor', 'thrustMotor', 'thrustCount', 'battery', 'material', 'throttle', 'vaneAngle', memo);
  // 舊版 JSX 內嵌的三個字串算式（工程設計建議段）
  const oldNotes = (s, P) => ({ vaneLoss: (100 - Math.cos(s.vaneAngle*Math.PI/180)*100).toFixed(1),
    fSideTxt: P.fSide.toFixed(0), batteryPct: ((s.battery.weight / P.totalMass) * 100).toFixed(1) });
  const { HW, hoverPhysics } = new Function(phys(newSrc('hovercraft/index.html')) + '; return { HW, hoverPhysics };')();
  eq(JSON.stringify(HW), JSON.stringify(oldDB), '硬體資料庫');
  // 2026-09-30 P09：推力電壓修正由線性 V/14.8 改為 (V/14.8)²（物理修正，非改寫誤差）。
  // 只有 4S（14.8 V）兩種公式都等於 1，等價對帳限定 4S；3S 的新公式另由 fixes/physics_decisions_1 對帳。
  let n = 0; const rows = [];
  for (const lm of oldDB.motors) for (const tm of oldDB.motors) for (const tc of [1, 2]) for (const bat of oldDB.batteries.filter(b => b.voltage === 14.8))
  for (const mat of oldDB.materials) for (const lift of [0, 20, 45, 73, 100]) for (const thr of [0, 37, 100]) for (const vane of [-30, -5, 0, 15, 30]) {
    const s = { liftMotor: lm, thrustMotor: tm, thrustCount: tc, battery: bat, material: mat, throttle: { lift, thrust: thr }, vaneAngle: vane };
    const A = oldPhys(lm, tm, tc, bat, mat, s.throttle, vane), An = oldNotes(s, A);
    const ns = { ...s, liftMotor: HW.motors.find(m => m.id === lm.id), thrustMotor: HW.motors.find(m => m.id === tm.id),
      battery: HW.batteries.find(b => b.id === bat.id), material: HW.materials.find(m => m.id === mat.id) };
    const B = hoverPhysics(ns);
    for (const k of ['totalMass', 'isHovering', 'hoverH', 'fForward', 'fSide', 'twr', 'liftUtil']) eq(A[k], B[k], `hover ${k} ${lm.id}/${tm.id}/${tc}/${bat.id}/${mat.id}/${lift}/${thr}/${vane}`);
    for (const k of ['vaneLoss', 'fSideTxt', 'batteryPct']) eq(An[k], B[k], `hover note ${k}`);
    if (rows.length < 6 && n % 1111 === 0) rows.push([`${lm.id}/${tm.id}×${tc}/${bat.id}/${mat.id} 油門${lift}/${thr} 舵${vane}`, A.totalMass, B.totalMass, A.hoverH.toFixed(4), B.hoverH.toFixed(4), A.twr, B.twr, A.liftUtil, B.liftUtil, A.fSide.toFixed(3), B.fSide.toFixed(3)]);
    n++;
  }
  console.log(`hovercraft：${n} 組參數組合`);
  console.log('  抽樣（參數｜總重 舊/新｜hoverH 舊/新｜TWR 舊/新｜升力比 舊/新｜側向力 舊/新）');
  rows.forEach(r => console.log('  ' + r.join(' | ')));
}

// ---------- spectral-lab ----------
{
  const o = oldSrc('spectral-lab/index.html');
  const fnTxt = o.match(/const computeOptics = (\(\) => \{[\s\S]*?\n        \});/)[1];
  const oldCompute = st => new Function('state', `return (${fnTxt})();`)(st);
  const camTxt = o.match(/const angle = Math\.atan2\(p, q\);[\s\S]*?const y = radius \* Math\.sin\(angle\);/)[0];
  const oldEye = (p, q) => new Function('p', 'q', `const radius = 2.0; ${camTxt}; return { x, y, z: 0.5 };`)(p, q);
  const N = new Function(phys(newSrc('spectral-lab/index.html')) + '; return { computeOptics, cameraEye, waveNumbers };')();
  const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const realRandom = Math.random;
  const sets = [
    { points: 2000, baseK: 1.2, rot: 5, dispersion: 1.2 },
    { points: 3000, baseK: 0.5, rot: 0, dispersion: 1.0 },
    { points: 3000, baseK: 2.5, rot: 45, dispersion: 2.0 },
    { points: 2500, baseK: 1.7, rot: 12.5, dispersion: 1.5 },
    { points: 1500, baseK: 0.9, rot: 30, dispersion: 1.8 },
    { points: 15000, baseK: 1.2, rot: 5, dispersion: 1.2 },
  ];
  console.log('spectral-lab：同一亂數種子下舊版／新版逐點對帳');
  sets.forEach((st, si) => {
    Math.random = mulberry(1000 + si); const A = oldCompute(st);
    Math.random = mulberry(1000 + si); const B = N.computeOptics(st);
    Math.random = realRandom;
    eq(A.x.length, B.n, `點數 set${si}`); eq(A.eff, B.eff, `效率 set${si}`);
    let maxErr = 0, colorMis = 0;
    for (let i = 0; i < Math.min(A.x.length, B.n); i++) {
      maxErr = Math.max(maxErr, Math.abs(A.x[i] - B.x[i]), Math.abs(A.y[i] - B.y[i]), Math.abs(A.z[i] - B.z[i]));
      if (A.c[i] !== `rgb(${B.r[i]},${B.g[i]},${B.b[i]})`) colorMis++;
    }
    eq(maxErr < 1e-6, true, `座標誤差 set${si}`); eq(colorMis, 0, `顏色 set${si}`);
    console.log(`  set${si} K=${st.baseK} θ=${st.rot}° D=${st.dispersion} N=${st.points}：點數 ${A.x.length}/${B.n}，效率 ${A.eff}%/${B.eff}%，座標最大誤差 ${maxErr.toExponential(1)}，顏色不符 ${colorMis}`);
  });
  for (const [p, q] of [[1, 1], [1, 2], [1, 3], [0, 1]]) { const a = oldEye(p, q), b = N.cameraEye(p, q);
    ['x', 'y', 'z'].forEach(k => eq(a[k], b[k], `視角 ${p}:${q} ${k}`)); }
  console.log('  歐幾里得視角 1:1、1:2、1:3、0:1 相機位置已對帳');
}
console.log(`\n共 ${checks} 項比對，失敗 ${fails}`);
process.exit(fails ? 1 : 0);
