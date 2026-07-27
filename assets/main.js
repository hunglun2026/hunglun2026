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
    overlay.addEventListener('click', () => overlay.remove());
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
    });
    document.body.appendChild(overlay);
  });
});

// 瀏覽人數計數器（Cloudflare Worker + KV，每次進頁+1，從145956起算）
const visitCountEl = document.getElementById('visitCount');
if (visitCountEl) {
  fetch('https://huglun2026-visits.hunglun2026.workers.dev')
    .then((r) => r.json())
    .then((data) => { visitCountEl.textContent = data.count.toLocaleString(); })
    .catch(() => { visitCountEl.textContent = '145,956'; });
}
