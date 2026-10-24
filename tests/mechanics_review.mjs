// 力學館審查修正（2026-10-24）的物理數值檢查：從頁面原始碼擷取純函式執行，和獨立公式對帳。
// 用法：node tests/mechanics_review.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = p => readFileSync(path.join(root, p), 'utf8');
function fn(code, name) {
  const m = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{').exec(code); if (!m) throw new Error('找不到 ' + name);
  let i = m.index + m[0].length, d = 1; while (d && i < code.length) { d += code[i] === '{' ? 1 : code[i] === '}' ? -1 : 0; i++; }
  return code.slice(m.index, i);
}
let fails = 0, checks = 0;
const near = (a, b, what, tol = 1e-9) => { checks++; const ok = Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); if (!ok) { fails++; console.log('  ✗', what, a, b); } };
const g = 9.8;
// 潛水艇：PHYS 區塊
{ const phys = src('submarine/index.html').split('/*PHYS:BEGIN*/')[1].split('/*PHYS:END*/')[0];
  const { subModel, diverModel } = new Function(phys + '; return { subModel, diverModel };')();
  const hullV = 6000, hullMass = 5.6e6, tankV = 600, rho = 1025;
  for (const fill of [0, 0.3, 0.5, 1]) {
    const r = subModel({ hullV, hullMass, tankV, fill, rho, g }), mass = hullMass + rho * tankV * fill;
    near(r.mass, mass, `質量 fill=${fill}`); near(r.B, rho * g * hullV, `浮力不隨注水改變 fill=${fill}`); near(r.net, rho * g * hullV - mass * g, `淨力 fill=${fill}`);
  }
  const nf = (rho * hullV - hullMass) / (rho * tankV);
  near(subModel({ hullV, hullMass, tankV, fill: nf, rho, g }).net, 0, '中性浮力水量時淨力為 0', 1e-6);
  const d = diverModel({ glassV: 1e-6, airV0: 2e-6, mass: 2.5e-3, depth: 0.2, squeeze: 20000, rho: 1000, g, P0: 101325 });
  near(d.airV, 2e-6 * 101325 / (101325 + 1000 * g * 0.2 + 20000), '浮沉子 波以耳定律');
  console.log('submarine：潛艇 4 種注水量＋中性浮力＋浮沉子');
}
// 推箱子：靜摩擦→動摩擦
{ const c = src('newton-force/index.html'); const { frictionFor, rampSeries } = new Function(fn(c, 'frictionFor') + fn(c, 'rampSeries') + '; return { frictionFor, rampSeries };')();
  near(frictionFor(10, 5, g, 0.5, 0.4), 10, '靜摩擦＝施力'); near(frictionFor(24.5, 5, g, 0.5, 0.4), 24.5, '剛好最大靜摩擦'); near(frictionFor(30, 5, g, 0.5, 0.4), 0.4 * 5 * g, '滑動後＝動摩擦');
  const s = rampSeries(40, 40, 5, g, 0.5, 0.4); near(s.length, 41, '序列長度'); near(s[24][1], 24, 'F=24 時 f=24'); near(s[25][1], 0.4 * 5 * g, 'F=25 已滑動');
  console.log('newton-force：靜摩擦上升到 μs·N 後掉到 μk·N');
}
// 滑輪：定、動、滑輪組
{ const c = src('machines/index.html'); const pulleyIdeal = new Function(fn(c, 'pulleyIdeal') + '; return pulleyIdeal;')();
  for (const [k, n, MA] of [['fixed', 1, 1], ['movable', 2, 2], ['pulley', 4, 4], ['pulley', 6, 6]]) {
    const r = pulleyIdeal(k, 240, n, 0.3); near(r.MA, MA, `${k} MA`); near(r.F, 240 / MA, `${k} F`); near(r.rope, MA * 0.3, `${k} 拉繩距離`); near(r.workIn, r.workOut, `${k} 功相等`);
  }
  console.log('machines：定滑輪、動滑輪、滑輪組 MA 與功');
}
// 帕斯卡：體積守恆
{ const c = src('pascal-hydraulics/index.html'); const d2For = new Function('state', fn(c, 'd2For') + '; return d2For;');
  const st = { A1: 10, A2: 200, F1: 50 }; const f = d2For(st);
  near(f(10), 0.5, 'd2＝A1·d1/A2'); near(st.A1 * 10, st.A2 * f(10), 'A1d1＝A2d2'); near(st.F1 * 10, (st.F1 * st.A2 / st.A1) * f(10), 'W1＝W2');
  console.log('pascal-hydraulics：體積守恆、功守恆');
}
console.log(`\n共 ${checks} 項比對，失敗 ${fails}`);
process.exit(fails ? 1 : 0);
