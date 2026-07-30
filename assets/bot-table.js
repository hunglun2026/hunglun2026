/**
 * 台銀共同供應契約品項表的關鍵字與價格篩選。
 *
 * 表格列直接寫在 HTML 裡（不靠 JS 產生），沒開 JS 也讀得到完整資料，
 * 這支只負責隱藏不符合條件的列。
 */
(function () {
  const root = document.querySelector('[data-bot-table]');
  if (!root) return;

  const rows = Array.from(root.querySelectorAll('tbody tr'));
  const kw = root.querySelector('[data-bot-kw]');
  const min = root.querySelector('[data-bot-min]');
  const max = root.querySelector('[data-bot-max]');
  const reset = root.querySelector('[data-bot-reset]');
  const shown = root.querySelector('[data-bot-shown]');
  const empty = root.querySelector('[data-bot-empty]');

  // 先把每列的可搜尋文字與價格算好，避免每次輸入都重算
  const index = rows.map(function (tr) {
    return {
      tr: tr,
      text: (tr.dataset.search || tr.textContent).toLowerCase(),
      price: parseInt(tr.dataset.price, 10)
    };
  });

  function apply() {
    const q = (kw.value || '').toLowerCase().trim();
    const lo = parseFloat(min.value);
    const hi = parseFloat(max.value);
    let n = 0;

    index.forEach(function (it) {
      let ok = !q || it.text.indexOf(q) !== -1;
      if (ok && !isNaN(lo) && !(it.price >= lo)) ok = false;
      if (ok && !isNaN(hi) && !(it.price <= hi)) ok = false;
      it.tr.hidden = !ok;
      if (ok) n++;
    });

    shown.textContent = n;
    if (empty) empty.hidden = n !== 0;
  }

  [kw, min, max].forEach(function (el) {
    el.addEventListener('input', apply);
  });

  reset.addEventListener('click', function () {
    kw.value = '';
    min.value = '';
    max.value = '';
    apply();
  });
})();
