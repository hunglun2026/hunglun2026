/* 教學資源總覽頁：即時搜尋與「全部展開」。沒有這支 JS，頁面仍可用（全部文章是摺疊清單，連結都在頁面裡）。 */
(function () {
  var q = document.getElementById('knQ');
  if (!q) return;
  var main = document.getElementById('knMain');
  var box = document.getElementById('knResults');
  var list = document.getElementById('knResultsList');
  var title = document.getElementById('knResultsTitle');
  var clear = document.getElementById('knClear');
  var MAX = 40;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // 資料來源就是頁面上「全部文章」的每一列，所以新增文章不用另外維護搜尋清單
  var rows = [].slice.call(document.querySelectorAll('#all .kn-row')).map(function (a) {
    var t = a.querySelector('.kn-t').textContent.replace(/\s*新$/, '').trim();
    var d = a.getAttribute('data-d') || '';
    var tm = a.querySelector('time');
    return { href: a.getAttribute('href'), t: t, d: d, date: tm ? tm.textContent : '', c: (a.parentNode.className || ''), g: (a.closest('.kn-block') ? a.closest('.kn-block').querySelector('.kn-block-title a').textContent : ''), s: (t + ' ' + d).toLowerCase() };
  });

  function run() {
    var v = q.value.trim().toLowerCase();
    if (!v) {
      box.hidden = true;
      main.hidden = false;
      return;
    }
    var terms = v.split(/\s+/);
    var hit = rows.filter(function (r) {
      return terms.every(function (t) { return r.s.indexOf(t) > -1; });
    });
    // 標題就含全部關鍵字的排前面，只有說明命中的排後面（同分維持原本順序）
    hit = hit.map(function (r, i) {
      var inTitle = terms.every(function (t) { return r.t.toLowerCase().indexOf(t) > -1; });
      return { r: r, k: (inTitle ? 0 : 1) * 1000 + i };
    }).sort(function (x, y) { return x.k - y.k; }).map(function (x) { return x.r; });
    main.hidden = true;
    box.hidden = false;
    if (!hit.length) {
      title.textContent = '找不到符合的文章';
      list.innerHTML = '<li class="kn-empty" style="padding:14px 4px;color:var(--muted)">換個關鍵字試試，或從<a href="/knowledge">主題</a>進去找；找不到想問的，也可以<a href="/contact">直接問我們</a>。</li>';
      return;
    }
    title.textContent = '找到 ' + hit.length + ' 篇' + (hit.length > MAX ? '（顯示前 ' + MAX + ' 篇）' : '');
    list.innerHTML = hit.slice(0, MAX).map(function (r) {
      return '<li class="' + esc(r.c) + '"><a class="kn-row" href="' + esc(r.href) + '"><span class="kn-text"><span class="kn-t">' + (r.g ? '<span class="kn-tag">' + esc(r.g) + '</span>' : '') + esc(r.t) +
        '</span><span class="kn-d">' + esc(r.d) + '</span></span><time class="kn-date">' + esc(r.date) + '</time></a></li>';
    }).join('');
  }

  q.addEventListener('input', run);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { q.value = ''; run(); }
  });
  if (clear) clear.addEventListener('click', function () { q.value = ''; run(); q.focus(); });


  // 支援 /knowledge?q=關鍵字（站內搜尋或外部連結可以直接帶入）
  try {
    var p = new URLSearchParams(location.search).get('q');
    if (p) { q.value = p; run(); }
  } catch (e) { /* 舊瀏覽器略過 */ }
})();
