/* ===== 物理模擬共用繪圖／物理工具庫 (SIM) =====
   提供高品質繪圖原語：高清畫布、立體球體、接觸陰影、材質、按比例力箭頭、
   漸層場景、拖尾、座標映射、積分器。各頁以「不同配色＋版面＋場景」組合，避免千篇一律。 */
(function (global) {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // 全場一致的光源方向（指向光源，左上）—— 所有高光與陰影都依此，避免「貼紙感」
  const LIGHT = { x: -0.45, y: -0.62 };

  // 物理量固定色彩圖例（跨所有頁一致，學生可遷移語意）
  const C = {
    vel: '#43d17a',      // 速度 綠
    acc: '#ffb02e',      // 加速度 橙
    force: '#ff5470',    // 合力 紅
    gravity: '#c06bff',  // 重力 紫
    normal: '#4cc2ff',   // 正向力 藍
    friction: '#ff7a45', // 摩擦 橘紅
    tension: '#8b9cff',  // 張力 靛
    comp: '#8a99ad',     // 分量虛線 灰
  };

  // ---- 高清畫布：CSS 尺寸固定、backing store ×dpr、繪圖用 CSS px ----
  function setup(canvas, cssW, cssH) {
    const dpr = global.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx._w = cssW; ctx._h = cssH; ctx._dpr = dpr;
    return ctx;
  }
  // 讓畫布充滿其容器寬度、依比例定高
  function fit(canvas, aspect) {
    const cssW = canvas.parentElement.clientWidth;
    const cssH = Math.round(cssW / aspect);
    return setup(canvas, cssW, cssH);
  }

  // ---- 立體球體：偏移徑向漸層 + 高光 + 邊緣光 ----
  function sphere(ctx, x, y, r, hsl, opts = {}) {
    const [h, s, l] = hsl;
    const col = (ll, a = 1) => `hsla(${h},${s}%,${clamp(ll, 0, 100)}%,${a})`;
    const hx = x + LIGHT.x * r * 0.55, hy = y + LIGHT.y * r * 0.55;
    const g = ctx.createRadialGradient(hx, hy, r * 0.05, x, y, r);
    g.addColorStop(0, col(l + 36)); g.addColorStop(0.18, col(l + 18));
    g.addColorStop(0.55, col(l)); g.addColorStop(0.85, col(l - 22)); g.addColorStop(1, col(l - 34));
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    if (opts.glint !== false) {
      const sx = x + LIGHT.x * r * 0.6, sy = y + LIGHT.y * r * 0.6;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.34);
      sg.addColorStop(0, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---- 接觸陰影：壓扁橢圓，隨離地高度變大變淡 ----
  function shadow(ctx, x, groundY, r, height = 0) {
    const lift = clamp(height / (r * 6), 0, 1);
    const rx = r * (1.05 + lift * 1.3), ry = rx * 0.26;
    const a = 0.4 * (1 - lift * 0.7);
    const g = ctx.createRadialGradient(x, groundY, 0, x, groundY, rx);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.7, `rgba(0,0,0,${a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(x, groundY); ctx.scale(1, ry / rx); ctx.translate(-x, -groundY);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, groundY, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ---- 按比例力箭頭：錨定作用點、頭部隨線寬等比、可畫分量虛線 ----
  function arrow(ctx, x1, y1, x2, y2, opts = {}) {
    const { color = C.force, width = 3, headScale = 4.2, label = null, dash = false, font = '600 13px system-ui', alpha = 1 } = opts;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 1) return; const ang = Math.atan2(dy, dx);
    const hl = clamp(width * headScale, 8, len * 0.55);
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    if (dash) ctx.setLineDash([5, 5]);
    const bx = x2 - Math.cos(ang) * hl * 0.85, by = y2 - Math.sin(ang) * hl * 0.85;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl * Math.cos(ang - 0.42), y2 - hl * Math.sin(ang - 0.42));
    ctx.lineTo(x2 - hl * Math.cos(ang + 0.42), y2 - hl * Math.sin(ang + 0.42));
    ctx.closePath(); ctx.fill();
    if (label) { ctx.font = font; ctx.fillStyle = color;
      ctx.fillText(label, x2 + Math.cos(ang) * 9 - 4, y2 + Math.sin(ang) * 9 + 4); }
    ctx.restore();
  }
  // 分量分解：x、y 分量箭頭 + 半透明直角矩形
  function components(ctx, x1, y1, x2, y2, opts = {}) {
    const cx = x2, cy = y1; // 直角頂點
    ctx.save(); ctx.fillStyle = (opts.rect || 'rgba(255,255,255,.06)');
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ctx.restore();
    arrow(ctx, x1, y1, cx, cy, { color: opts.colorX || C.normal, width: 2.5, label: opts.labelX, dash: false });
    arrow(ctx, cx, cy, x2, y2, { color: opts.colorY || C.acc, width: 2.5, label: opts.labelY, dash: false });
  }

  // ---- 漸層場景背景（依配色），可選地平線/地面/透視格/暈影 ----
  function scene(ctx, pal, opts = {}) {
    const W = ctx._w, H = ctx._h;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (opts.ground != null) {
      const gy = opts.ground;
      if (pal.ground) {
        const gg = ctx.createLinearGradient(0, gy, 0, H);
        gg.addColorStop(0, pal.ground); gg.addColorStop(1, pal.groundDark || pal.ground);
        ctx.fillStyle = gg; ctx.fillRect(0, gy, W, H - gy);
      }
      if (opts.perspective && pal.grid) {
        ctx.strokeStyle = pal.grid;
        for (let i = 0; i <= 10; i++) { const t = i / 10; const y = gy + (H - gy) * (t * t);
          ctx.globalAlpha = 0.10 + 0.18 * t; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        const vp = W / 2; for (let i = -7; i <= 7; i++) { ctx.globalAlpha = 0.08;
          ctx.beginPath(); ctx.moveTo(vp + i * 26, gy); ctx.lineTo(vp + i * (W / 5), H); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = pal.horizon || 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    if (opts.vignette !== false) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, pal.vignette || 'rgba(0,0,0,.38)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- 材質 ----
  function metal(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#9aa3ad'); g.addColorStop(0.18, '#eef2f5'); g.addColorStop(0.45, '#6b7480');
    g.addColorStop(0.55, '#5b636e'); g.addColorStop(0.85, '#aeb6c0'); g.addColorStop(1, '#7c838d');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y + h * 0.16, w, Math.max(1, h * 0.04));
  }
  function water(ctx, x, y, w, h, t = 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(150,220,255,.5)'); g.addColorStop(0.15, 'rgba(70,160,220,.5)'); g.addColorStop(1, 'rgba(20,70,120,.62)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(220,250,255,.8)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += 6) ctx.lineTo(gx, y + Math.sin(gx * 0.06 + t * 2) * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(180,230,255,.10)'; ctx.lineWidth = 6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let gx = x; gx <= x + w; gx += 10)
      ctx.lineTo(gx, y + h * (0.3 + 0.25 * k) + Math.sin(gx * 0.04 + t * 1.5 + k) * 10); ctx.stroke(); }
    ctx.restore();
  }
  function bulb(ctx, x, y, r, color = '255,220,120', intensity = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    halo.addColorStop(0, `rgba(${color},${0.45 * intensity})`); halo.addColorStop(0.4, `rgba(${color},${0.12 * intensity})`); halo.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill(); ctx.restore();
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, '#fffef0'); core.addColorStop(0.6, `rgba(${color},1)`); core.addColorStop(1, `rgba(${color},.7)`);
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // ---- 拖尾（環形緩衝，漸隱錐形）----
  function Trail(max = 36) { this.pts = []; this.max = max; }
  Trail.prototype.push = function (x, y) { this.pts.push({ x, y }); if (this.pts.length > this.max) this.pts.shift(); };
  Trail.prototype.clear = function () { this.pts = []; };
  Trail.prototype.draw = function (ctx, rgb = '120,200,255', maxW = 6) {
    for (let i = 1; i < this.pts.length; i++) { const t = i / this.pts.length;
      ctx.strokeStyle = `rgba(${rgb},${t * 0.55})`; ctx.lineWidth = t * maxW;
      ctx.beginPath(); ctx.moveTo(this.pts[i - 1].x, this.pts[i - 1].y); ctx.lineTo(this.pts[i].x, this.pts[i].y); ctx.stroke(); }
  };

  // ---- 座標映射：物理單位(公尺) ↔ 螢幕像素 ----
  function Map2D(simRect, scrRect, yUp = true) {
    this.s = simRect; this.r = scrRect; this.yUp = yUp;
    this.kx = scrRect.w / simRect.w; this.ky = scrRect.h / simRect.h;
  }
  Map2D.prototype.x = function (sx) { return this.r.x + (sx - this.s.x) * this.kx; };
  Map2D.prototype.y = function (sy) { return this.yUp ? this.r.y + this.r.h - (sy - this.s.y) * this.ky : this.r.y + (sy - this.s.y) * this.ky; };
  Map2D.prototype.len = function (l) { return l * this.kx; };

  // ---- 固定步長累加器（框架率無關、子步穩定）----
  function Stepper(fixedDt = 1 / 120, maxSub = 8) { this.dt = fixedDt; this.maxSub = maxSub; this.acc = 0; this.last = 0; }
  Stepper.prototype.tick = function (now, stepFn) {
    if (!this.last) this.last = now; let f = (now - this.last) / 1000; this.last = now;
    f = Math.min(f, 0.05); this.acc += f; let n = 0;
    while (this.acc >= this.dt && n < this.maxSub) { stepFn(this.dt); this.acc -= this.dt; n++; }
  };

  // ---- 配色（視覺識別）----
  const PALETTES = {
    sky: { skyTop: '#3f7fc4', skyBottom: '#bfe0f5', ground: '#5d8a4a', groundDark: '#3c5e30', grid: 'rgba(255,255,255,.5)', horizon: 'rgba(255,255,255,.35)', vignette: 'rgba(10,20,30,.35)' },
    space: { skyTop: '#0b1026', skyBottom: '#05060f', grid: 'rgba(120,160,255,.4)', vignette: 'rgba(0,0,0,.5)' },
    optics: { skyTop: '#f4f7fb', skyBottom: '#dde6f0', grid: 'rgba(60,90,130,.25)', horizon: 'rgba(60,90,130,.4)', vignette: 'rgba(40,60,90,.18)' },
    lab: { skyTop: '#1a2233', skyBottom: '#0a0e17', ground: '#222c3f', groundDark: '#141b28', grid: 'rgba(120,150,200,.3)', horizon: 'rgba(150,180,220,.3)', vignette: 'rgba(0,0,0,.45)' },
    warm: { skyTop: '#2a2018', skyBottom: '#140d08', ground: '#3a2a1c', groundDark: '#241810', grid: 'rgba(255,200,140,.35)', horizon: 'rgba(255,200,140,.3)', vignette: 'rgba(0,0,0,.45)' },
  };

  global.SIM = { TAU, clamp, lerp, LIGHT, C, setup, fit, sphere, shadow, arrow, components, scene, metal, water, bulb, Trail, Map2D, Stepper, PALETTES };
})(window);
