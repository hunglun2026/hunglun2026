/* 學生統計展示頁：讀 data.json（教育部統計處快照），畫趨勢圖、縣市排行、年齡金字塔 */
(function () {
  'use strict';
  var LEVELS = ['幼兒園', '國小', '國中', '高中職', '大專'];
  var NS = 'http://www.w3.org/2000/svg';
  var D, years, state = { year: 114, level: '全部', sortBy: 'n', q: '' };
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n.toLocaleString('zh-TW'); };
  var pct = function (a, b) { return b ? ((a - b) / b * 100) : 0; };
  var sgn = function (p) { return (p > 0 ? '+' : '') + p.toFixed(1) + '%'; };

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  // 縣市某學制人數；「全部」＝五個學制加總
  function cv(row, level) {
    if (level !== '全部') return row[level];
    return LEVELS.reduce(function (s, l) { return s + row[l]; }, 0);
  }
  function sumYear(y, level) {
    return D.county.filter(function (r) { return r.y === y; })
      .reduce(function (s, r) { return s + cv(r, level); }, 0);
  }
  function officialTotal(y) {
    return D.level.filter(function (r) { return r.y === y && r.item === '總計'; })[0].total;
  }

  function renderKpis() {
    var y = state.year, lv = state.level, prev = y - 1, first = years[0];
    var tot = officialTotal(y), totPrev = years.indexOf(prev) >= 0 ? officialTotal(prev) : null;
    var cur = sumYear(y, lv), base = sumYear(first, lv);
    var rows = D.county.filter(function (r) { return r.y === y; })
      .sort(function (a, b) { return cv(b, lv) - cv(a, lv); });
    $('k1').innerHTML = '<div class="k">' + y + ' 學年度全國學生總數</div><div class="v">' + fmt(tot) +
      '</div><div class="d">' + (totPrev ? '較上一學年 ' + sgn(pct(tot, totPrev)) : '最早一學年') + '</div>';
    $('k2').innerHTML = '<div class="k">' + (lv === '全部' ? '五大學制合計' : lv) + '，較 ' + first + ' 學年度</div><div class="v">' +
      sgn(pct(cur, base)) + '</div><div class="d">' + fmt(base) + ' 人 → ' + fmt(cur) + ' 人</div>';
    $('k3').innerHTML = '<div class="k">' + (lv === '全部' ? '五大學制合計' : lv) + '人數最多的縣市</div><div class="v">' +
      rows[0].c + '</div><div class="d">' + fmt(cv(rows[0], lv)) + ' 人，占全國 ' +
      (cv(rows[0], lv) / cur * 100).toFixed(1) + '%</div>';
  }

  /* ---------- 趨勢圖 ---------- */
  function renderTrend() {
    var W = 760, H = 320, L = 64, R = 70, T = 14, B = 30, svg = $('trend');
    svg.innerHTML = '';
    var series = LEVELS.map(function (l) { return years.map(function (y) { return sumYear(y, l); }); });
    var max = Math.max.apply(null, [].concat.apply([], series)) * 1.05;
    var x = function (i) { return L + (W - L - R) * i / (years.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - v / max); };
    for (var g = 0; g <= 4; g++) {
      var gv = max * g / 4, gy = y(gv);
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: gy, y2: gy, 'class': 'axis' }));
      svg.appendChild(el('text', { x: L - 8, y: gy + 4, 'text-anchor': 'end' }, (gv / 10000).toFixed(0) + ' 萬'));
    }
    years.forEach(function (yr, i) {
      if (i % 2 === 0 || yr === state.year) svg.appendChild(el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, yr));
    });
    var si = years.indexOf(state.year);
    svg.appendChild(el('line', { x1: x(si), x2: x(si), y1: T, y2: H - B, stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
    // 右側標籤：由上往下排，相鄰不足 15px 就往下推，避免兩條線數值接近時疊字
    var labelY = [], order = series.map(function (s, k) { return k; })
      .sort(function (a, b) { return y(series[a][years.length - 1]) - y(series[b][years.length - 1]); });
    order.forEach(function (k, j) {
      var ly = y(series[k][years.length - 1]);
      labelY[k] = j && ly < labelY[order[j - 1]] + 15 ? labelY[order[j - 1]] + 15 : ly;
    });
    series.forEach(function (s, k) {
      var c = 'var(--s' + k + ')';
      var d = s.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: c, 'stroke-width': LEVELS[k] === state.level ? 3.5 : 2, 'stroke-linejoin': 'round' }));
      svg.appendChild(el('circle', { cx: x(si), cy: y(s[si]), r: 4, fill: c }));
      svg.appendChild(el('text', { x: W - R + 6, y: labelY[k] + 4, style: 'fill:' + c + ';font-weight:600' }, LEVELS[k]));
    });
    var hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
    function readout(i) {
      $('trendRead').textContent = years[i] + ' 學年度：' + LEVELS.map(function (l, k) { return l + ' ' + fmt(series[k][i]); }).join('，');
    }
    hit.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      readout(Math.max(0, Math.min(years.length - 1, Math.round((px - L) / (W - L - R) * (years.length - 1)))));
    });
    svg.appendChild(hit);
    readout(si);
  }

  /* ---------- 縣市排行 + 搜尋 ---------- */
  function renderCounty() {
    var y = state.year, lv = state.level, q = state.q.trim().replace(/台/g, '臺');
    var prevRows = {};
    D.county.filter(function (r) { return r.y === y - 1; }).forEach(function (r) { prevRows[r.c] = cv(r, lv); });
    var rows = D.county.filter(function (r) { return r.y === y; }).map(function (r) {
      var n = cv(r, lv), p = prevRows[r.c];
      return { c: r.c, n: n, ch: p ? pct(n, p) : null };
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }));
    rows = rows.filter(function (r) { return !q || r.c.indexOf(q) >= 0; });
    rows.sort(function (a, b) { return state.sortBy === 'n' ? b.n - a.n : (a.ch == null) - (b.ch == null) || a.ch - b.ch; });
    var ul = $('rows');
    ul.innerHTML = '';
    if (!rows.length) { ul.innerHTML = '<li class="ss-empty">找不到符合「' + state.q.replace(/</g, '&lt;') + '」的縣市</li>'; return; }
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'ss-row';
      li.innerHTML = '<span>' + r.c + '</span><span class="bar"><i style="width:' + (r.n / max * 100).toFixed(1) + '%"></i></span>' +
        '<span class="n">' + fmt(r.n) + (r.ch == null ? '' : '<em>較前一年 ' + sgn(r.ch) + '</em>') + '</span>';
      ul.appendChild(li);
    });
  }

  /* ---------- 年齡金字塔 ---------- */
  function renderPyramid() {
    var W = 760, svg = $('pyr'), rowH = 18, T = 20, H = T + 28 * rowH + 10, mid = W / 2;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    var rows = D.age.filter(function (r) { return r.y === state.year; });
    var ages = []; rows.forEach(function (r) { if (ages.indexOf(r.age) < 0) ages.push(r.age); });
    ages.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    var get = function (a, g) { return rows.filter(function (r) { return r.age === a && r.g === g; })[0].n; };
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }));
    var half = mid - 70, w = function (n) { return n / max * half; };
    svg.appendChild(el('text', { x: mid - 70, y: 12, 'text-anchor': 'end', style: 'fill:var(--male);font-weight:600' }, '男'));
    svg.appendChild(el('text', { x: mid + 70, y: 12, style: 'fill:var(--female);font-weight:600' }, '女'));
    ages.forEach(function (a, i) {
      var yy = T + i * rowH, m = get(a, '男'), f = get(a, '女');
      svg.appendChild(el('rect', { x: mid - 36 - w(m), y: yy, width: w(m), height: rowH - 3, fill: 'var(--male)' }));
      svg.appendChild(el('rect', { x: mid + 36, y: yy, width: w(f), height: rowH - 3, fill: 'var(--female)' }));
      svg.appendChild(el('text', { x: mid, y: yy + rowH - 6, 'text-anchor': 'middle' }, a));
      var t1 = el('title', {}, a + '：男 ' + fmt(m) + ' 人，女 ' + fmt(f) + ' 人');
      svg.appendChild(t1);
    });
    svg.appendChild(el('text', { x: 4, y: H - 2 }, '單位：人。滑過長條可看人數。'));
  }

  function renderAll() { renderKpis(); renderTrend(); renderCounty(); renderPyramid(); }

  function init() {
    years = Array.from(new Set(D.county.map(function (r) { return r.y; }))).sort();
    state.year = years[years.length - 1];
    var ys = $('selYear'), ls = $('selLevel');
    years.slice().reverse().forEach(function (y) { ys.add(new Option(y + ' 學年度', y)); });
    ['全部'].concat(LEVELS).forEach(function (l) { ls.add(new Option(l === '全部' ? '全部學制' : l, l)); });
    ys.addEventListener('change', function () { state.year = +ys.value; renderAll(); });
    ls.addEventListener('change', function () { state.level = ls.value; renderAll(); });
    $('q').addEventListener('input', function (e) { state.q = e.target.value; renderCounty(); });
    document.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.sortBy = b.getAttribute('data-sort');
        document.querySelectorAll('[data-sort]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
        renderCounty();
      });
    });
    $('built').textContent = D.built;
    renderAll();
  }

  fetch('/demo-student-stats/data.json?v=1').then(function (r) { return r.json(); })
    .then(function (d) { D = d; init(); })
    .catch(function () { $('k1').textContent = '資料載入失敗，請重新整理頁面。'; });
})();
