// 深色/淺色模式切換（預設淺色，記住使用者選擇）
const themeToggle = document.getElementById('themeToggle');
function syncThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (themeToggle) themeToggle.textContent = isDark ? '☀️' : '🌙';
}
syncThemeIcon();
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('hunglun-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('hunglun-theme', 'dark');
    }
    syncThemeIcon();
  });
}

// 手機版選單
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    // aria-label 也要跟著換，否則螢幕閱讀器在選單已展開時仍唸「開啟選單」
    toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
  });
}

/* 可橫向捲動的容器要能用鍵盤捲動（WCAG 2.1.1）。
   規格表與證照牆在窄螢幕會橫向捲動，但滑鼠／觸控之外沒有任何操作方式——
   鍵盤使用者根本看不到被切掉的欄位。內容真的溢出時才給 tabindex，
   否則桌機會多出一堆沒用的 Tab 停留點。 */
(function () {
  var sel = '.bot-table-scroll, .spec-table-wrap, .cert-gallery';
  function sync() {
    document.querySelectorAll(sel).forEach(function (el) {
      var scrollable = el.scrollWidth > el.clientWidth + 1;
      if (scrollable && !el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
        /* 用 group 不用 region：region 是「地標」，同一頁多個同名地標會互相難以分辨
           （第一版寫 region 就被 axe 的 landmark-unique 抓到）。group 不是地標，
           但一樣會把 aria-label 唸出來。 */
        el.setAttribute('role', 'group');
        if (!el.getAttribute('aria-label')) {
          // 標籤取前面最近的標題，同一頁多個表格才分得出來是哪一個
          var prev = el.previousElementSibling, title = '';
          while (prev && !title) {
            if (/^H[1-6]$/.test(prev.tagName)) title = prev.textContent.trim();
            prev = prev.previousElementSibling;
          }
          el.setAttribute('aria-label', (title ? title + '：' : '') + '可左右捲動的內容');
        }
      } else if (!scrollable && el.getAttribute('tabindex') === '0') {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    });
  }
  sync();
  window.addEventListener('resize', sync);
})();

// 捲動淡入
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// 備援：3 秒後尚未觸發的元素一律顯示，避免任何情況下內容看不到
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'));
}, 3000);

/* 點圖放大（.lightbox 圖片點擊後全螢幕檢視，Esc／點背景關閉）

   2026-08-06 無障礙修正：原本只綁 click 在 <img> 上，<img> 不可聚焦也沒有鍵盤事件，
   等於鍵盤使用者完全打不開燈箱（WCAG 2.1.1）；開啟後焦點還留在 body，
   螢幕閱讀器使用者不知道畫面上多了一個對話框，關閉後焦點也沒還原。 */
document.querySelectorAll('img.lightbox').forEach((img) => {
  // 讓圖片變成可聚焦的按鈕
  img.setAttribute('tabindex', '0');
  img.setAttribute('role', 'button');
  if (!img.getAttribute('aria-label')) {
    img.setAttribute('aria-label', (img.alt || '圖片') + '（放大檢視）');
  }

  function open() {
    const opener = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', img.alt || '圖片放大檢視');
    overlay.innerHTML = `<button class="lightbox-close" aria-label="關閉">✕</button><img src="${img.src}" alt="${img.alt}">`;
    const closeBtn = overlay.querySelector('.lightbox-close');

    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      // 焦點鎖在燈箱內，Tab 不會跑回底下的頁面
      if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    }
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus();   // 焦點還給原本那張圖
    }
    // 點背景或關閉鈕才關；點圖片本身不關，否則想看大圖卻一點就消失
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === closeBtn) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    closeBtn.focus();
  }

  img.addEventListener('click', open);
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
});

// 瀏覽人數計數器（Cloudflare Worker + KV，每次進頁+1，接續舊官網從 409260 起算）
const visitCountEl = document.getElementById('visitCount');
if (visitCountEl) {
  fetch('https://huglun2026-visits.hunglun2026.workers.dev')
    .then((r) => r.json())
    .then((data) => { visitCountEl.textContent = data.count.toLocaleString(); })
    .catch(() => { visitCountEl.textContent = '409,260'; });
}

// 標題裡的「Google」以官方 wordmark 配色呈現（G藍 o紅 o黃 g藍 l綠 e紅）。
// 只套在標題與少數強調處，內文維持一般顏色，避免整頁花掉；
// alt／title 等屬性不受影響，複製貼上得到的仍是純文字「Google」。
(function () {
  var COLORS = ['#4285f4', '#ea4335', '#fbbc05', '#4285f4', '#34a853', '#ea4335'];
  var targets = document.querySelectorAll('h1, h2, h3, .stat .num, .l-eyebrow, .eyebrow');
  targets.forEach(function (el) {
    if (el.closest('.site-header, .site-footer')) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.indexOf('Google') !== -1) nodes.push(walker.currentNode);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(Google)/).forEach(function (part) {
        if (part !== 'Google') { frag.appendChild(document.createTextNode(part)); return; }
        var word = document.createElement('span');
        word.className = 'g-word';
        // 拆成 6 個 span 之後，螢幕閱讀器有機會逐字唸成「G、o、o、g、l、e」。
        // 整個詞掛 aria-label、字母各自 aria-hidden，唸出來才是「Google」。
        word.setAttribute('aria-label', 'Google');
        word.setAttribute('role', 'img');
        for (var i = 0; i < 6; i++) {
          var letter = document.createElement('span');
          letter.style.color = COLORS[i];
          letter.textContent = part[i];
          letter.setAttribute('aria-hidden', 'true');
          word.appendChild(letter);
        }
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });
  });
})();

/* 頁尾信箱的「複製」按鈕：桌機使用者點 mailto 會被拉去開郵件軟體，
   多數人其實只是想把地址複製起來貼到別的地方。按鈕獨立於 <a> 之外，
   不影響原本點連結寄信的行為。Clipboard API 在非 https 或舊瀏覽器不可用，
   退回 execCommand 的隱藏 textarea 作法。 */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.fc-copy') : null;
    if (!btn) return;
    e.preventDefault();
    var text = btn.getAttribute('data-copy') || '';
    var label = btn.getAttribute('data-label') || '複製';

    function done() {
      btn.textContent = '已複製';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = label;
        btn.classList.remove('copied');
      }, 1600);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { /* 複製不成就維持原樣 */ }
      document.body.removeChild(ta);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  });
})();
