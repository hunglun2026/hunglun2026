(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Sticky morph：手機三段畫面切換 ----------
  const section = document.getElementById('morphSection');
  const phone = document.getElementById('phone');
  const screens = Array.from(document.querySelectorAll('.l-app-screen'));
  const sideLeft = document.querySelector('.l-side-left');
  const sideRight = document.querySelector('.l-side-right');
  const progressFill = document.getElementById('progressFill');

  function setActiveScreen(progress) {
    const n = screens.length || 1;
    const index = Math.min(n - 1, Math.floor(progress * n));
    screens.forEach((el, i) => el.classList.toggle('active', i === index));
  }

  function onScroll() {
    if (!section || !phone) return;
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const raw = -rect.top / total;
    const progress = clamp(raw, 0, 1);

    let scale, opacity;
    if (progress < 0.15) {
      const t = progress / 0.15;
      scale = lerp(0.85, 1.05, t);
      opacity = t;
    } else if (progress < 0.85) {
      scale = 1.05;
      opacity = 1;
    } else {
      const t = (progress - 0.85) / 0.15;
      scale = lerp(1.05, 0.9, t);
      opacity = 1 - t;
    }
    phone.style.transform = `scale(${scale})`;
    phone.style.opacity = opacity;

    setActiveScreen(progress);

    [sideLeft, sideRight].forEach((el) => {
      if (!el) return;
      const speed = parseFloat(el.dataset.parallax) || 1;
      const t = clamp((progress - 0.05) / 0.35, 0, 1);
      const fadeOut = clamp((progress - 0.7) / 0.25, 0, 1);
      el.style.opacity = Math.min(t, 1 - fadeOut);
      el.style.transform = `translateY(${lerp(40, -20, t) * speed - progress * 30}px)`;
    });

    if (progressFill) progressFill.style.width = `${progress * 100}%`;
  }

  // ---------- 角色展示／頁面巡覽：N 段面板依捲動進度切換 ----------
  const deviceSection = document.getElementById('deviceSection');
  const rolePanels = deviceSection ? Array.from(deviceSection.querySelectorAll('.l-role-panel')) : [];
  const deviceHeading = document.getElementById('deviceHeading');
  const deviceDesc = document.getElementById('deviceDesc');
  const deviceLink = document.getElementById('deviceLink');
  const deviceTag = document.getElementById('deviceTag');
  const deviceDots = deviceSection ? Array.from(deviceSection.querySelectorAll('.l-dot')) : [];

  function onDeviceScroll() {
    if (!deviceSection) return;
    const rect = deviceSection.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = clamp(-rect.top / total, 0, 1);

    const n = rolePanels.length || 1;
    const continuous = progress * Math.max(n - 1, 1);
    const index = Math.min(n - 1, Math.round(continuous));

    rolePanels.forEach((el, i) => {
      const offset = i - continuous;
      // 奇偶交錯：偶數段從右邊飄進、奇數段從左邊飄進，加上輕微下沉/旋轉/縮小，做出「飄過來」的感覺
      const dir = i % 2 === 0 ? 1 : -1;
      const tx = offset * 120 * dir;
      const ty = Math.abs(offset) * 8;
      const rot = offset * 6 * dir;
      const scale = clamp(1 - Math.abs(offset) * 0.12, 0.8, 1);
      const opacity = clamp(1 - Math.abs(offset) * 1.15, 0, 1);
      el.style.transform = `translateX(${tx}%) translateY(${ty}%) rotate(${rot}deg) scale(${scale})`;
      el.style.opacity = opacity;
      el.classList.toggle('active', i === index);
    });
    deviceDots.forEach((el, i) => el.classList.toggle('active', i === index));
    const active = rolePanels[index];
    if (deviceHeading && active && active.dataset.title) deviceHeading.innerHTML = active.dataset.title;
    if (deviceDesc && active && active.dataset.desc) deviceDesc.textContent = active.dataset.desc;
    if (deviceLink && active && active.dataset.href) deviceLink.setAttribute('href', active.dataset.href);
    if (deviceTag) deviceTag.textContent = `${String(index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  }

  // ---------- 數字跑動 banner ----------
  const statBanner = document.getElementById('statBanner');
  const statBannerBg = document.getElementById('statBannerBg');
  let statAnimated = false;

  function onStatScroll() {
    if (!statBanner || !statBannerBg) return;
    const rect = statBanner.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom > 0 && rect.top < vh) {
      const centerOffset = (rect.top + rect.height / 2 - vh / 2) / vh;
      statBannerBg.style.transform = `translateY(${centerOffset * 60}px) scale(1.08)`;
    }
    if (!statAnimated && rect.top < vh * 0.75) {
      statAnimated = true;
      animateStats();
    }
  }

  function animateStats() {
    document.querySelectorAll('.l-stat-num').forEach((el) => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ---------- 全螢幕照片 zoom-through 巡覽（品牌導覽頁）----------
  // 仿 wearebrand.io：捲動時鏡頭「穿越」目前畫面（放大+淡出）飛進下一景（由小放大浮現），文字跟著飄過
  const tourZoom = document.getElementById('tourZoom');
  const tzPanels = tourZoom ? Array.from(tourZoom.querySelectorAll('.tour-zoom-panel')) : [];
  const tzDots = tourZoom ? Array.from(tourZoom.querySelectorAll('.l-dot')) : [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onTourZoom() {
    if (!tourZoom || reduceMotion) return;
    const rect = tourZoom.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = clamp(-rect.top / total, 0, 1);

    const n = tzPanels.length || 1;
    const continuous = progress * Math.max(n - 1, 1);
    const index = Math.min(n - 1, Math.round(continuous));

    tzPanels.forEach((el, i) => {
      const off = i - continuous;
      // 純淡入淡出：拿掉 scale 縮放穿越感（會誘發暈眩），只留 sticky 置中 + 交叉淡出
      const opacity = clamp(1 - Math.abs(off) * 1.3, 0, 1);
      const z = off >= 0 ? 10 - Math.ceil(off) : 20;
      el.style.transform = 'none';
      el.style.opacity = opacity;
      el.style.zIndex = z;
      // 已經淡出的 panel（off < 0）z-index 是 20，蓋在目前這張上面；雖然看不見，
      // 它的 <img> 仍然吃得到滑鼠事件，會擋掉目前這張的「前往頁面」按鈕。
      // 只讓「幾乎完全顯示」的那張接收點擊，其餘一律穿透。
      el.style.pointerEvents = opacity > 0.85 ? 'auto' : 'none';

      const txt = el.querySelector('.tour-zoom-text');
      if (txt) {
        txt.style.transform = `translateY(${off * 8}vh)`;
        txt.style.opacity = clamp(1 - Math.abs(off) * 1.7, 0, 1);
      }
    });
    tzDots.forEach((el, i) => el.classList.toggle('active', i === index));
  }

  function onAllScroll() {
    onScroll();
    onDeviceScroll();
    onStatScroll();
    onTourZoom();
  }

  window.addEventListener('scroll', () => requestAnimationFrame(onAllScroll), { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(onAllScroll));
  onAllScroll();

  const revealEls = document.querySelectorAll('.l-reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  revealEls.forEach((el) => io.observe(el));
})();
