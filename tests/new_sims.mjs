// 新模擬頁（2026-10-24，feat/new-sims）的物理數值檢查：從每頁擷取 /*PHYS:BEGIN*/…/*PHYS:END*/ 區塊執行，
// 和 tests/new_sims_checks.json 的期望值對帳。期望值由 Python 獨立實作算出（不呼叫頁面函式：必歐-沙伐用數值積分、
// RLC 用複數阻抗、熱傳導用傅立葉級數、反射牆用逐趟事件模擬…），產生程式在 PhysicsLab 專案 dispatch/newsims/checks.py。
// 用法：node tests/new_sims.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = JSON.parse(readFileSync(path.join(root, 'tests/new_sims_checks.json'), 'utf8'));
const cache = {};
function phys(slug) {
  if (cache[slug]) return cache[slug];
  const f = path.join(root, slug, 'index.html');
  if (!existsSync(f)) throw new Error('找不到頁面 ' + slug);
  const m = /\/\*PHYS:BEGIN\*\/([\s\S]*?)\/\*PHYS:END\*\//.exec(readFileSync(f, 'utf8'));
  if (!m) throw new Error(slug + ' 缺 PHYS 區塊');
  return (cache[slug] = m[1]);
}
function close(a, b, tol, rel) {
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && a.every((x, i) => close(x, b[i], tol, rel));
  if (typeof a !== 'number') return false;
  const d = Math.abs(a - b); return d === 0 || d <= (rel ? tol * Math.max(Math.abs(b), 1e-300) : tol);
}
let fails = 0; const per = {}, skipped = new Set();
for (const c of checks) {
  if (!existsSync(path.join(root, c.slug, 'index.html'))) { skipped.add(c.slug); continue; }
  let got, err = null;
  try { got = new Function(phys(c.slug) + '\nreturn (function(){' + c.js + '})();')(); } catch (e) { err = e.message; }
  const ok = !err && close(got, c.expect, c.tol, c.rel);
  per[c.slug] = per[c.slug] || [0, 0]; per[c.slug][ok ? 0 : 1]++;
  if (!ok) { fails++; console.log('  ✗', c.slug, '｜', c.name, '得', err || JSON.stringify(got), '應', JSON.stringify(c.expect)); }
}
for (const [s, [p, f]] of Object.entries(per)) console.log(`${s}：${p} 項通過${f ? `、${f} 項失敗` : ''}`);
if (skipped.size) console.log('（頁面還沒建立、略過：' + [...skipped].join('、') + '）');
console.log(`\n共 ${Object.values(per).reduce((a, [p, f]) => a + p + f, 0)} 項比對，失敗 ${fails}`);
process.exit(fails ? 1 : 0);
