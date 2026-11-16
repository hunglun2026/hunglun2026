/* 全站章節標題色標記：內容頁 main 裡每個大標題（h2）依出現順序輪流標上 Google 藍、紅、黃、綠。
   靠左的標題畫左側色條，置中的標題畫下方色線；只加 data-sb 屬性，樣式在 style.css。首頁與工具頁面板不處理。 */
(function () {
  var main = document.querySelector('main');
  if (!main || document.body.classList.contains('landing')) return;
  var skip = '.kb-quick,.svc-cta,.page-head,.site-footer,.faq-a,details,.share-box,.hero,.l-hero,.series-pager,.contact-card,.kn-block-title,.cookie,[data-no-sb]';
  var hs = [].slice.call(main.querySelectorAll('h2')).filter(function (h) { return !h.closest(skip); });
  hs.forEach(function (h, i) {
    h.setAttribute('data-sb', String(i % 4));
    var cs = getComputedStyle(h);
    if (cs.textAlign === 'center') h.setAttribute('data-sb-center', '');
  });
})();
