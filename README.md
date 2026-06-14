# AI 協作物理互動模擬（ai-physics-demos）

源自與 AI（Gemini）的物理討論，將理論分析重建為可在瀏覽器即時操作的互動網頁。
純前端 HTML / Canvas，無外部相依、無建置步驟，適合課堂教學演示。

## 內容
- `superposition/` — 干涉與摩爾紋：同一種疊加（概念整合 hub）：一維拍頻即時示範，說明干涉/繞射/摩爾紋本質相同，連到兩個細部模擬。
- `hovercraft/` — RC 氣墊船工程開發模擬器：選配馬達/電池/材料，即時算總重、推重比、升力餘裕與導風板向量轉向（React + lucide-react，瀏覽器內 Babel）。
- `housing/` — 全台房市實證數據系統：34 區、44 季價量軌跡與跨週期對比互動儀表板（React + Chart.js，瀏覽器內 Babel）。
- `spectral-lab/` — 光譜干涉實驗室（歐幾里得視角）：三維三原色干涉光場，可調頻率/晶格夾角/色散，切換有理數視線比例觀察「視覺走廊」與色散（源自 Gemini Canvas，Plotly 3D）。
- `diffraction/` — 繞射成像：雙狹縫 / 單狹縫干涉繞射，可調相位差 Δφ 與「前後距離差 ΔL」，觀察主峰偏移與非對稱條紋。
- `moire/` — 摩爾紋（Moiré）：兩組光柵（平行線 / 同心圓 / 點陣）疊加，調間距與角度、可旋轉動畫。
- 外科無影燈 3D 專業版：另一 repo `shadowless-lamp-sim`（Three.js+IES），作品集卡片外連之；本 repo 的 `shadowless-lamp/` 為 2D 概念版。
- `shadowless-lamp/` — 外科無影燈光學：多光源消影，線段-圓遮蔽運算，示範陰影互補。

> 註：`hovercraft/`、`housing/`、`spectral-lab/` 透過 CDN 載入函式庫，需連網；其餘為純 HTML/Canvas 可離線。

## 本機預覽
```
python3 -m http.server 8123 --directory .
# 開 http://localhost:8123/
```

## 線上展示
GitHub Pages：見 repo 的 Pages 連結（首頁 index.html 串連三個展示）。

---
參數為教學示意用途，數值尺度已調整以利觀察現象。
