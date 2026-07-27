// 網頁效果 demo 頁互動邏輯
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. 捲動淡入
function playReveal() {
  const box = document.querySelector('.demo-reveal-box');
  if (!box) return;
  box.classList.remove('playing');
  void box.offsetWidth; // 移除 class 讓動畫瞬間歸零，重播才會每次都完整播完
  box.classList.add('playing');
}

// 2. 打字機
function playTypewriter() {
  const el = document.querySelector('.demo-typewriter');
  if (!el) return;
  const text = el.dataset.text || '';
  el.textContent = '';
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, i);
    i++;
    if (i <= text.length) setTimeout(tick, 80);
  };
  tick();
}

// 3. 數字滾動
function playCounter() {
  const el = document.querySelector('.demo-counter .num');
  if (!el) return;
  const target = parseInt(el.dataset.target, 10) || 0;
  const dur = 1200;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// 8. 掃描辨識
function playScan() {
  const line = document.querySelector('.demo-scan-line');
  if (!line) return;
  line.classList.remove('playing');
  void line.offsetWidth;
  line.classList.add('playing');
}

// 6. 粒子背景（用 ResizeObserver 偵測 canvas 從 0 尺寸變成實際尺寸的時機，
// 因為 demo 一開始在「網頁效果」分頁裡，分頁預設 hidden，頁面載入當下 canvas 量到的寬高是 0）
let particlesStarted = false;
function startParticles() {
  const canvas = document.querySelector('.demo-particles canvas');
  if (!canvas || prefersReduced || particlesStarted) return;
  if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return; // 還沒真的顯示出來，先不啟動
  particlesStarted = true;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  function init() {
    resize();
    particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.8,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
    }));
  }
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1e3a5f';
  const LINK_DIST = 110;
  function frame() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    });
    // 粒子之間距離夠近就連線，形成星座網絡感，比單純飄浮的點明顯很多
    ctx.strokeStyle = accentColor;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.globalAlpha = (1 - dist / LINK_DIST) * 0.5;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.9;
    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  init();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

// 5. 3D 傾斜卡片（滑鼠互動，綁定一次即可，跟分頁是否可見無關；角度加大＋加動態陰影＋高光跟著滑鼠跑）
const tiltCard = document.querySelector('.demo-tilt-card');
if (tiltCard && !prefersReduced) {
  const wrap = tiltCard.closest('.demo-tilt-wrap');
  wrap.addEventListener('mousemove', (e) => {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tiltCard.style.transform = `scale(1.08) rotateY(${x * 38}deg) rotateX(${-y * 38}deg)`;
    tiltCard.style.boxShadow = `${-x * 36}px ${18 - y * 10}px 30px -6px rgba(0,0,0,0.45)`;
    tiltCard.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`);
    tiltCard.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`);
  });
  wrap.addEventListener('mouseleave', () => {
    tiltCard.style.transform = 'scale(1) rotateY(0) rotateX(0)';
    tiltCard.style.boxShadow = '';
  });
}

// 這幾個 demo（捲動淡入／數字滾動／掃描辨識）原本用 IntersectionObserver 偵測捲動進場，
// 但「網頁效果」分頁預設是 hidden，切分頁那瞬間卡片本來就已經在畫面內，不會有真的捲動觸發；
// 改成分頁切換時由 services.html 的分頁切換程式直接呼叫 window.playEffectsDemoTab() 觸發一次。
window.playEffectsDemoTab = function () {
  playReveal();
  playTypewriter();
  playCounter();
  playScan();
  requestAnimationFrame(startParticles);
};

// 滑鼠移到卡片上就重播一次該卡片的特效，不用按鈕
document.querySelectorAll('.effect-card[data-effect]').forEach((card) => {
  card.addEventListener('mouseenter', () => {
    const effect = card.dataset.effect;
    if (effect === 'reveal') playReveal();
    if (effect === 'typewriter') playTypewriter();
    if (effect === 'counter') playCounter();
    if (effect === 'scan') playScan();
  });
});

// 若「網頁效果」分頁本來就是可見的（例如非分頁式的獨立頁面），頁面載入時就直接播放一次
(function () {
  const panel = document.getElementById('tab-effects');
  if (!panel || !panel.hidden) window.playEffectsDemoTab();
})();
