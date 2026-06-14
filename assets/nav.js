/* 共用頂部導覽：頁面 <body data-demo="名稱" [data-base="../"]> 後載入即可自動注入 */
(function () {
  var b = document.body;
  var title = b.getAttribute('data-demo') || '';
  var base = b.getAttribute('data-base') || '../';
  var svg = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect width="32" height="32" rx="7" fill="#101828"/>' +
    '<polygon points="8,23 16,7 24,23" fill="none" stroke="#4cc2ff" stroke-width="2" stroke-linejoin="round"/>' +
    '<line x1="16.5" y1="14" x2="28" y2="12.5" stroke="#ff6b9d" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="16.5" y1="16" x2="28" y2="16" stroke="#ffce54" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="16.5" y1="18" x2="28" y2="19.5" stroke="#7CFFB2" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var nav = document.createElement('header');
  nav.className = 'site-nav';
  nav.innerHTML =
    '<a class="brand" href="' + base + '">' + svg +
      '<span><span class="b2">物理</span> <span class="b1-long">互動</span>模擬平台</span></a>' +
    (title ? '<span class="cur">' + title + '</span>' : '') +
    '<a class="back" href="' + base + '">← 返回作品集</a>';
  b.insertBefore(nav, b.firstChild);
})();
