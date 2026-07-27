# 鴻綸科技（hunglun-new）品牌識別系統

本文件是這個網站視覺與內容規範的唯一真實來源（single source of truth）。之後任何新頁面、新元件、改版，都照這份文件走，不要憑感覺另外發明一套。若要調整規範本身，先改這份文件，再回頭套用到頁面。

設計語彙：**Kenya Hara 式日式極簡**——米白留白、細線分隔（hairline）取代陰影卡片、扁平無圓角、深藍/亮藍點綴、Noto Sans TC 細字重為主。

---

## 1. Logo

| 用途 | 檔案 | 說明 |
|---|---|---|
| 淺色模式 header/footer | `assets/hunglun-logo-company-light.png` | 深色文字版，`img.logo-light`，深色模式時 `display:none` |
| 深色模式 header/footer | `assets/hunglun-logo-dark-header.png` | 已去背去白邊，`img.logo-dark`，淺色模式時 `display:none` |
| OG/社群分享縮圖、JSON-LD `logo` 欄位 | `assets/hunglun-logo-dark.png` | 固定深色底版本，不隨主題切換（社群平台不吃 CSS） |
| ~~`assets/hunglun-logo-company.png`~~ | 已棄用，不再被任何頁面引用，保留檔案未刪除，**新頁面不要用這個** |

Google 認證徽章統一用**直式（文字置中）版本** `assets/gfe-partner-badge-vertical.png`，但**只在 about.html／brand.html 的獨立「Google 官方認證」展示區塊**用（`.badge-chip-lg`，`height:150px`）——**footer 不再重複放徽章**：header/footer 用的合成 logo（見上）本身已經把公司名稱＋Google 徽章畫在同一張圖裡，footer 若再放一次獨立徽章圖就是視覺重複，2026-07-23 已從全站 footer 移除（連帶清掉 CSS 裡的 `.footer-badge` 規則）。~~`assets/gfe-partner-badge.png`~~（橫式、文字靠左）2026-07-23起已棄用不再被引用，保留檔案未刪除。

**通用原則：同一個視覺區塊裡不要讓同一個品牌元素（logo／認證徽章）出現兩次**——新增任何區塊前，先確認附近（尤其是 header/footer 這種每頁都會重複出現的區塊）有沒有已經含有同樣資訊的元素。

**規則**：
- Header/footer 一律用 `<a class="brand">` 內同時放 `.logo-light` + `.logo-dark` 兩張圖，靠 CSS `data-theme` 屬性切換，不要只放一張圖再用濾鏡轉色（實測會有邊緣不乾淨的問題，見下方「已知坑」）
- 兩張圖是**完整合成圖**（鴻綸科技＋Google for Education Professional Development Partner 徽章並排），不要只用純鴻綸文字版單獨放大——這是 Steve 在第十七輪明確指定的版本
- 圖檔加 `?v=N` cache-busting query，之後若換圖記得把版號 +1（瀏覽器對圖片快取比 CSS/JS 頑固，改檔名參數才根治）
- Google 認證徽章（`gfe-partner-badge*.png`）永遠獨立包在白底 `.badge-chip` 裡使用（footer 直式徽章、about/index 的認證區塊），**不可以**直接貼在深色背景上——Google 官方規範要求徽章必須在白色/淺色底才能維持可讀性與合規
- Logo 在窄螢幕（`max-width:860px`）縮到 `height:72px`；`.brand` 容器設 `max-width:55%; flex-shrink:1; min-width:0`，圖片 `max-width:100%`，避免寬版合成 logo（實測寬高比約 5:1）把手機版漢堡選單擠出可視範圍外（2026-07-23 修過的真實 bug，見下方已知坑）

---

## 2. 色彩

CSS variable 定義在 `assets/style.css` 的 `:root`（淺色，預設）與 `:root[data-theme="dark"]`（深色）。**所有色彩一律吃這組變數，不寫死 hex**（社群平台品牌色、Google 徽章白底除外，見下方例外）。

| Token | 淺色 | 深色 | 用途 |
|---|---|---|---|
| `--bg` | `#fdfdfc` 米白 | `#141414` 護眼深黑 | 頁面底色 |
| `--bg-soft` | `#f7f7f5` | `#1b1b1b` | 區塊底色（alt section） |
| `--card` / `--card-hover` | `#ffffff` | `#1b1b1b` | 卡片底色（本站卡片扁平無陰影，這個值多半跟 bg-soft 相近） |
| `--text` | `#1a1a1a` | `#f2f2f0` | 主要文字 |
| `--muted` | `#5c5c5c` | `#9a9a96` | 次要文字 |
| `--muted-faint` | `#9a9a96` | `#6b7280` | 更淡的輔助文字 |
| `--accent` | `#1e3a5f` 深藍 | `#7fa8d9` 亮藍 | 主色：連結、按鈕、active 狀態、圖示 |
| `--accent-deep` | `#15293f` | `#5f87b8` | 主色加深（hover 等） |
| `--line` | `rgba(0,0,0,.09)` | `rgba(255,255,255,.10)` | 一般分隔線 |
| `--grid-line` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.05)` | 更淡的格線（掃描效果格線等裝飾用） |
| `--header-bg` | `rgba(253,253,252,.92)` | `rgba(20,20,20,.9)` | Header 半透明底色 |
| `--glow` | `rgba(30,58,95,.10)` | `rgba(127,168,217,.14)` | 輕量光暈效果 |

**例外**（刻意不吃變數，允許寫死 hex）：
- 社群平台品牌色：Facebook `#1877F2`、LINE `#06C755`、Google Maps 紅 `#EA4335`——第三方品牌色不可自行改色
- Google 徽章 `.badge-chip` 背景固定 `#fff`——合規要求，不隨深色模式變
- **疊在照片背景上的文字**（`landing.css` 的 `.tour-zoom-text` 系列）固定用 `#fff`／`#ffd68a`——這類文字蓋在情境照片上，不是蓋在 `--bg` 上，不能吃隨主題變化的 `--text`/`--accent`，否則深色模式會變成深色文字疊深色照片看不見

新增變數前先想：這個顏色未來深色模式要怎麼對應？沒想清楚就先別寫死 hex。

---

## 3. 字體

- **唯一字體**：`Noto Sans TC`（`font-family: "Noto Sans TC", "PingFang TC", system-ui, sans-serif`，宣告在 `body`，全站不覆蓋）
- 載入：**全站統一**用同一條 Google Fonts 連結（2026-07-24 第四十三輪稽核統一，之前每頁各自載不同字重範圍，導致部分頁面缺 300/500/600/800 等實際會用到的字重，渲染不一致）：
  `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap`
  每頁 `<head>` 都要有 `preconnect`（fonts.googleapis.com、fonts.gstatic.com）+ 這條 `<link>`，新增頁面直接複製，不要自己減少字重範圍
- 字重原則：本文/標題預設走**細字重**（Kenya Hara 極簡美學核心），大字標語不要用到 900 粗黑撐版面（第十六輪修過「往下捲看完整個網站」這種粗800字重跟全站風格不搭的問題）
- **等寬字體**（`--mono`: `"JetBrains Mono", ui-monospace, ...`）只用在「資料感」文字：統計數字（stat num）、eyebrow 標籤、瀏覽人次、tag 標籤——做出「資料讀取」質感，不要用在一般內文
- 中文排版一律 `zh-Hant-TW`，`<html lang="zh-Hant-TW">`

---

## 4. 圖示

- 一律用 **Tabler Icons**（tabler.io/icons，MIT 授權）的線條 SVG，**inline 貼進 HTML**（不要用 `<img src>`），這樣 `stroke="currentColor"` 才能吃到 CSS `color`，深/淺色模式與 `--accent` 才會自動對
- 已有素材放在 `assets/icons/`，授權說明在 `assets/icons/CREDITS.txt`，新增圖示比照相同來源與格式（保留原始 `viewBox`/`path`，不要手改座標）
- 不用 emoji 當內容圖示（卡片、服務項目等）——emoji 在極簡風裡顯得廉價、跨系統渲染不一致（第十二輪的教訓）
- **例外**：功能性 UI 慣用符號可以留 emoji/符號，例如主題切換 🌙/☀️、漢堡選單 ☰——這些是操作慣例圖示，不是「內容」，改動風險大於美感收益

---

## 5. 攝影／圖片風格

首頁巡覽、服務卡片等情境照片一律用 AI 生成（`tools/gemini-auto/gemini_image.py`），Prompt 固定套用以下關鍵字組合，避免「一看就是 AI 圖」：

- **紀實感**：`documentary-style candid photography`、`not a polished stock photo`、`natural lighting`
- **在地感**：`genuine Taiwanese people, ordinary clothing`、`authentic Taiwanese school/office architecture`（真實台灣校園紅磚建築、老式鋁窗、教室日光燈等元素）
- **畫質詞彙同時要加，避免為了去 AI 味犧牲質感**：`professional photography, high quality, editorial quality, sharp focus, well-composed`
- 生成後固定用「裁角法」去除 Gemini 浮水印（右下角約 130px 範圍，直接裁掉再等比放大回原尺寸，不要用 inpaint 修補，複雜背景/人物花紋上會留痕）
- 若圖片內出現裝置螢幕等需要顯示文字的元素，AI 生成的文字一定是亂碼假字——用多邊形遮罩（不是矩形，跟著螢幕實際傾斜角度）＋高斯模糊處理掉，不要整張重生成賭運氣
- 真實照片（非生成）來源用 Pexels 等 CC0/免署名授權圖庫，需在頁面加圖說標註來源

---

## 6. 版面與元件

- **扁平無陰影**：卡片用 `border-bottom` 分隔取代立體陰影＋圓角（`--radius:4px` 只用在極少數需要的地方，不是預設卡片樣式）
- **hairline 分隔線**取代卡片邊框：`--line` / `--grid-line`，大量留白
- 標題/副標**左對齊**為主（不置中），呼應日式極簡的不對稱留白美學
- 按鈕兩種：實心直角深藍（主要 CTA）、底線文字連結（次要動作）——不用圓角膠囊按鈕
- Header/footer 全站共用同一份標記結構（見 `about.html` 等任一頁的 `<header class="site-header">`／`<footer class="site-footer">` 區塊直接複製），**不要**每頁各自微調結構，否則之後全站改版要一個個對
- 深色模式切換：`data-theme` 屬性 + `localStorage['hunglun-theme']`，`<head>` 要有 anti-FOUC inline script（讀 localStorage 後在畫面渲染前就設定好，避免重新整理閃白/閃黑）

---

## 7. 已知坑（避免重蹈覆轍）

1. **Logo 去背要「還原顏色」不能只調 alpha**：白色文字去背若只調透明度，深色底會出現白色暈邊，PIL 要做 un-matte（還原前景真實色再套透明度）
2. **雙圖切換用 CSS class selector 要注意特異度**：`.logo-light`/`.logo-dark` 這種切換規則要放在 CSS 檔案**最後面**，特異度不夠會被前面 `.brand img` 這類規則蓋掉，兩張圖同時顯示變重影
3. **窄螢幕 flex 版面**：`.brand { flex-shrink:0 }` 配上寬版合成 logo 會把 header 其他元素（漢堡選單、主題切換鈕）擠出可視範圍，手機完全點不到——`.brand` 要能縮（`flex-shrink:1; min-width:0`），並設 `max-width` 上限
4. **`scroll-behavior:smooth` 干擾自動化截圖**：Playwright 用 `window.scrollTo` 測試前，先關掉 smooth scroll（`document.documentElement.style.scrollBehavior='auto'`），否則會拍到捲動中間態誤判成 bug
5. **`.reveal` 捲動淡入動畫的 fullPage 截圖假象**：Playwright `fullPage:true` 截圖不會觸發真實捲動，IntersectionObserver 判定畫面外元素仍是「不可見」，會停在 `opacity:0`——驗證時要真的 `scrollBy` 分段截圖，不能只看一張 fullPage 圖就下結論
6. **Google 徽章不能疊在非白底元素上**：任何新頁面若要放 Google for Education 認證徽章，一律包 `.badge-chip`

---

## 8. 待清理

（無，已於2026-07-23第二十八輪清除：`assets/style-home.css`、`assets/hunglun-logo-company.png`、`assets/gfe-partner-badge.png`三個孤兒檔案已刪除；`certfied/`原始證書掃描檔資料夾也已刪除——網站實際顯示用的`assets/cert-*.png`處理過版本已存在且已上線，原始素材無需保留，且該資料夾若進版控會透過subtree push讓5張證書掃描檔可被公開網址直接存取，Steve確認直接刪除即可，不進版控。）
