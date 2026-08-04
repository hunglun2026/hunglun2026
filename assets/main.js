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
  });
}

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

// 點圖放大（.lightbox 圖片點擊後全螢幕檢視，Esc／點背景關閉）
document.querySelectorAll('img.lightbox').forEach((img) => {
  img.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<button class="lightbox-close" aria-label="關閉">✕</button><img src="${img.src}" alt="${img.alt}">`;
    function onEsc(e) { if (e.key === 'Escape') close(); }
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onEsc);
    }
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onEsc);
    document.body.appendChild(overlay);
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
        for (var i = 0; i < 6; i++) {
          var letter = document.createElement('span');
          letter.style.color = COLORS[i];
          letter.textContent = part[i];
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
