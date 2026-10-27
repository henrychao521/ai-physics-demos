// 全站審查第二輪（2026-10-24）的物理數值檢查：從頁面擷取純函式，和獨立公式對帳。用法：node tests/review_round2.mjs
import { readFileSync, existsSync } from 'node:fs';
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
const near = (a, b, what, tol = 1e-9) => { checks++; const ok = (a === b) || Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); if (!ok) { fails++; console.log('  ✗', what, a, b); } };
// 透鏡、面鏡：1/f=1/p+1/q、m=−q/p（實像 q>0）
for (const page of ['lens', 'mirror']) {
  const c = src(page + '/index.html'); const imageOf = new Function(fn(c, 'imageOf') + '; return imageOf;')();
  for (const f of [15, -15, 20, -20]) for (const p of [5, 10, 20, 30, 45, 60, 90]) {
    if (p === f) continue; const q = 1 / (1 / f - 1 / p), r = imageOf(p, f);
    near(r.q, q, `${page} p=${p} f=${f} q`); near(r.m, -q / p, `${page} m`); near(r.real ? 1 : 0, q > 0 ? 1 : 0, `${page} 實虛`); near(r.upright ? 1 : 0, -q / p > 0 ? 1 : 0, `${page} 正倒`);
  }
  near(imageOf(15, 15).atInfinity ? 1 : 0, 1, `${page} p=f 無窮遠`); const two = imageOf(30, 15); near(two.q, 30, `${page} 2f`); near(two.m, -1, `${page} 2f 等大倒立`);
  console.log(page + '：f=±15、±20 × 7 個物距＋特殊點');
}
// 核分裂：k=ν(1−吸收)(1−逸散)、N₀kⁿ
{ const c = src('nuclear-fission/index.html'); const { kEff, expectedFissions } = new Function(fn(c, 'kEff') + fn(c, 'expectedFissions') + '; return { kEff, expectedFissions };')();
  near(kEff(2.4, 0, 0.2), 1.92, 'k 無控制棒'); near(kEff(2.4, 0.5, 0.2), 0.96, 'k 控制棒一半'); near(kEff(2.43, 0.4, 0.3), 2.43 * 0.6 * 0.7, 'k');
  near(expectedFissions(5, 1, 1.92), 1.92 ** 5, '第 5 代'); near(expectedFissions(3, 10, 0.96), 10 * 0.96 ** 3, '次臨界衰減');
  console.log('nuclear-fission：增殖因數與各代分裂數'); }
// 聲波：雙音疊加用目前音色
{ const c = src('sound/index.html'); const { mixSample, wsample } = new Function(fn(c, 'wsample') + fn(c, 'mixSample') + '; return { mixSample, wsample };')();
  for (const type of ['sine', 'square', 'triangle', 'sawtooth']) for (const t of [0.0003, 0.0011, 0.0027]) {
    near(mixSample(t, 440, 444, type, true), wsample(type, 2 * Math.PI * 440 * t) + wsample(type, 2 * Math.PI * 444 * t), `雙音 ${type}`);
    near(mixSample(t, 440, 444, type, false), wsample(type, 2 * Math.PI * 440 * t), `單音 ${type}`);
  }
  console.log('sound：單音／雙音 × 4 種音色'); }
console.log(`\n共 ${checks} 項比對，失敗 ${fails}`);
process.exit(fails ? 1 : 0);
