const themeToggle=document.getElementById("themeToggle");function syncThemeIcon(){const isDark="dark"===document.documentElement.getAttribute("data-theme");themeToggle&&(themeToggle.textContent=isDark?"☀️":"🌙")}function syncTurnstileTheme(){if(!window.turnstile||"function"!=typeof window.turnstile.render)return;const isDark="dark"===document.documentElement.getAttribute("data-theme");document.querySelectorAll(".cf-turnstile[id]").forEach(el=>{const sitekey=el.getAttribute("data-sitekey");if(!sitekey)return;const lang=el.getAttribute("data-language")||"zh-tw";try{window.turnstile.remove(el.id)}catch(e){}el.innerHTML="";try{window.turnstile.render("#"+el.id,{sitekey:sitekey,language:lang,theme:isDark?"dark":"light"})}catch(e){}})}syncThemeIcon(),themeToggle&&themeToggle.addEventListener("click",()=>{"dark"===document.documentElement.getAttribute("data-theme")?(document.documentElement.removeAttribute("data-theme"),localStorage.setItem("hunglun-theme","light")):(document.documentElement.setAttribute("data-theme","dark"),localStorage.setItem("hunglun-theme","dark")),syncThemeIcon(),syncTurnstileTheme()});const toggle=document.querySelector(".nav-toggle"),nav=document.querySelector(".main-nav");toggle&&nav&&toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",open?"true":"false"),toggle.setAttribute("aria-label",open?"關閉選單":"開啟選單")}),function(){var sel=".bot-table-scroll, .spec-table-wrap, .cert-gallery";function sync(){document.querySelectorAll(sel).forEach(function(el){var scrollable=el.scrollWidth>el.clientWidth+1;if(scrollable&&!el.hasAttribute("tabindex")){if(el.setAttribute("tabindex","0"),el.setAttribute("role","group"),!el.getAttribute("aria-label")){for(var prev=el.previousElementSibling,title="";prev&&!title;)/^H[1-6]$/.test(prev.tagName)&&(title=prev.textContent.trim()),prev=prev.previousElementSibling;el.setAttribute("aria-label",(title?title+"：":"")+"可左右捲動的內容")}}else scrollable||"0"!==el.getAttribute("tabindex")||(el.removeAttribute("tabindex"),el.removeAttribute("role"),el.removeAttribute("aria-label"))})}if(sync(),window.addEventListener("resize",sync),document.fonts&&document.fonts.ready&&document.fonts.ready.then(sync),window.ResizeObserver){var ro=new ResizeObserver(sync);document.querySelectorAll(sel).forEach(function(el){ro.observe(el)})}}();const io=new IntersectionObserver(entries=>{entries.forEach(e=>{e.isIntersecting&&(e.target.classList.add("in"),io.unobserve(e.target))})},{threshold:.12});document.querySelectorAll(".reveal").forEach(el=>io.observe(el)),setTimeout(()=>{document.querySelectorAll(".reveal:not(.in)").forEach(el=>el.classList.add("in"))},3e3),function(){const nums=[...document.querySelectorAll(".stat .num")].filter(el=>/^\d/.test(el.textContent.trim()));if(!nums.length)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const numIo=new IntersectionObserver(entries=>{entries.forEach(e=>{e.isIntersecting&&(!function(el){const m=el.textContent.trim().match(/^(\d+)(.*)$/);if(!m)return;const target=parseInt(m[1],10),suffix=m[2],t0=performance.now();el.style.minWidth=el.getBoundingClientRect().width+"px",el.textContent="0"+suffix,requestAnimationFrame(function step(now){const p=Math.min((now-t0)/1100,1),eased=1-Math.pow(1-p,3);el.textContent=Math.round(target*eased)+suffix,p<1?requestAnimationFrame(step):el.style.minWidth=""})}(e.target),numIo.unobserve(e.target))})},{threshold:.6});nums.forEach(el=>numIo.observe(el))}(),document.querySelectorAll("img.lightbox").forEach(img=>{function open(){const opener=document.activeElement,overlay=document.createElement("div");overlay.className="lightbox-overlay",overlay.setAttribute("role","dialog"),overlay.setAttribute("aria-modal","true"),overlay.setAttribute("aria-label",img.alt||"圖片放大檢視"),overlay.innerHTML=`<button class="lightbox-close" aria-label="關閉">✕</button><img src="${img.src}" alt="${img.alt}">`;const closeBtn=overlay.querySelector(".lightbox-close");function onKey(e){"Escape"!==e.key?"Tab"===e.key&&(e.preventDefault(),closeBtn.focus()):close()}function close(){overlay.remove(),document.removeEventListener("keydown",onKey),opener&&opener.focus&&opener.focus()}overlay.addEventListener("click",e=>{e.target!==overlay&&e.target!==closeBtn||close()}),document.addEventListener("keydown",onKey),document.body.appendChild(overlay),closeBtn.focus()}img.setAttribute("tabindex","0"),img.setAttribute("role","button"),img.getAttribute("aria-label")||img.setAttribute("aria-label",(img.alt||"圖片")+"（放大檢視）"),img.addEventListener("click",open),img.addEventListener("keydown",e=>{"Enter"!==e.key&&" "!==e.key||(e.preventDefault(),open())})});const visitCountEl=document.getElementById("visitCount");if(visitCountEl){var today=(new Date).toDateString(),cachedDate=null,cachedCount=null;try{cachedDate=localStorage.getItem("hunglun-visit-date"),cachedCount=localStorage.getItem("hunglun-visit-count")}catch(e){}cachedDate===today&&cachedCount?visitCountEl.textContent=Number(cachedCount).toLocaleString():fetch("https://huglun2026-visits.hunglun2026.workers.dev").then(r=>r.json()).then(data=>{visitCountEl.textContent=data.count.toLocaleString();try{localStorage.setItem("hunglun-visit-date",today),localStorage.setItem("hunglun-visit-count",String(data.count))}catch(e){}}).catch(()=>{visitCountEl.textContent=cachedCount?Number(cachedCount).toLocaleString():"409,260"})}!function(){var COLORS=["#4285f4","#ea4335","#fbbc05","#4285f4","#34a853","#ea4335"];document.querySelectorAll("h1, h2, h3, .stat .num, .l-eyebrow, .eyebrow").forEach(function(el){if(!el.closest(".site-header, .site-footer")){for(var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];walker.nextNode();)-1!==walker.currentNode.nodeValue.indexOf("Google")&&nodes.push(walker.currentNode);nodes.forEach(function(node){var frag=document.createDocumentFragment();node.nodeValue.split(/(Google)/).forEach(function(part){if("Google"===part){var word=document.createElement("span");word.className="g-word",word.setAttribute("aria-label","Google"),word.setAttribute("role","img");for(var i=0;i<6;i++){var letter=document.createElement("span");letter.style.color=COLORS[i],letter.textContent=part[i],letter.setAttribute("aria-hidden","true"),word.appendChild(letter)}frag.appendChild(word)}else frag.appendChild(document.createTextNode(part))}),node.parentNode.replaceChild(frag,node)})}})}(),document.addEventListener("click",function(e){var btn=e.target.closest?e.target.closest(".fc-copy"):null;if(btn){e.preventDefault();var text=btn.getAttribute("data-copy")||"",label=btn.getAttribute("data-label")||"複製";navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(text).then(done,fallback):fallback()}function done(){btn.textContent="已複製",btn.classList.add("copied"),setTimeout(function(){btn.textContent=label,btn.classList.remove("copied")},1600)}function fallback(){var ta=document.createElement("textarea");ta.value=text,ta.setAttribute("readonly",""),ta.style.position="fixed",ta.style.top="-1000px",document.body.appendChild(ta),ta.select();try{document.execCommand("copy"),done()}catch(err){}document.body.removeChild(ta)}});;(function(){
  "use strict";
  var inner=document.querySelector(".header-inner");
  if(!inner) return;
  var btn=document.createElement("button");
  btn.type="button";btn.className="site-search-btn";
  btn.setAttribute("aria-label","搜尋網站");btn.setAttribute("title","搜尋網站");
  btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  var themeBtn=inner.querySelector(".theme-toggle");
  if(themeBtn) inner.insertBefore(btn,themeBtn); else inner.appendChild(btn);

  var overlay,input,list,status,idx=null,loading=false,lastFocus=null;

  function build(){
    overlay=document.createElement("div");
    overlay.className="site-search-overlay";overlay.hidden=true;
    overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label","站內搜尋");
    overlay.innerHTML=''
      +'<div class="ss-panel">'
      +'<div class="ss-bar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      +'<input type="search" class="ss-input" placeholder="搜尋服務、知識庫文章…" autocomplete="off" aria-label="搜尋關鍵字" aria-controls="ss-results">'
      +'<button type="button" class="ss-close" aria-label="關閉搜尋">✕</button></div>'
      +'<p class="ss-status" aria-live="polite"></p>'
      +'<ul class="ss-results" id="ss-results"></ul></div>';
    document.body.appendChild(overlay);
    input=overlay.querySelector(".ss-input");
    list=overlay.querySelector(".ss-results");
    status=overlay.querySelector(".ss-status");
    input.addEventListener("input",function(){render(input.value);});
    overlay.querySelector(".ss-close").addEventListener("click",close);
    overlay.addEventListener("mousedown",function(e){if(e.target===overlay)close();});
    overlay.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}});
  }

  function load(){
    if(idx||loading) return;
    loading=true;status.textContent="載入中…";
    fetch("/search-index.json").then(function(r){return r.json();}).then(function(d){
      idx=d;loading=false;render(input.value);
    }).catch(function(){loading=false;status.textContent="搜尋索引載入失敗，請稍後再試。";});
  }

  function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function render(q){
    q=(q||"").trim().toLowerCase();
    if(!idx){status.textContent=loading?"載入中…":"";list.innerHTML="";return;}
    if(!q){status.textContent="輸入關鍵字，搜尋全站的服務與文章。";list.innerHTML="";return;}
    var terms=q.split(/\s+/).filter(Boolean);
    var hits=[];
    for(var i=0;i<idx.length;i++){
      var it=idx[i],hay=(it.t+" "+it.d+" "+it.c).toLowerCase();
      var ok=true,score=0;
      for(var j=0;j<terms.length;j++){
        if(hay.indexOf(terms[j])<0){ok=false;break;}
        if(it.t.toLowerCase().indexOf(terms[j])>=0)score+=3;
        else if(it.c.toLowerCase().indexOf(terms[j])>=0)score+=2;
        else score+=1;
      }
      if(ok)hits.push({it:it,s:score});
    }
    hits.sort(function(a,b){return b.s-a.s;});
    status.textContent=hits.length?("找到 "+hits.length+" 筆"):"找不到符合的頁面，換個關鍵字試試。";
    list.innerHTML=hits.slice(0,12).map(function(h){
      var it=h.it;
      return '<li><a class="ss-item" href="'+esc(it.u)+'">'
        +'<span class="ss-item-top"><span class="ss-t">'+esc(it.t)+'</span>'
        +(it.c?'<span class="ss-c">'+esc(it.c)+'</span>':'')+'</span>'
        +'<span class="ss-d">'+esc(it.d)+'</span></a></li>';
    }).join("");
  }

  function open(){
    if(!overlay)build();
    lastFocus=document.activeElement;
    overlay.hidden=false;document.documentElement.style.overflow="hidden";
    load();
    setTimeout(function(){input.focus();render(input.value);},20);
  }
  function close(){
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;document.documentElement.style.overflow="";
    if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }

  btn.addEventListener("click",open);
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&overlay&&!overlay.hidden){e.preventDefault();close();return;}
    if(e.key==="/"&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||""))&&!e.target.isContentEditable){
      e.preventDefault();open();
    }
  });
})();
