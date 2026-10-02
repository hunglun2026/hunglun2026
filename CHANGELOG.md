# 更新紀錄

本網站的版本號採 SemVer（主.次.修）。單一來源是根目錄的 `VERSION` 檔，
頁尾顯示的版本號由 `sitemap/apply-version.py` 依該檔寫入全站頁面。

## v1.6.3（2026-10-02）

內部工具「ChromeOS Flex 遠端部署」說明改版，順手修好字型建置的兩個舊問題。

- **`/tools/flex-deploy` 換成新版完整使用說明**（22 章）：新增「沒有 Intune、沒有 CEU」的四種組合、
  部署前預檢、UEFI 轉換、S 模式、五條送貨路線（PsExec／Tailscale／Action1／自助／Intune）、
  轉完才要註冊 CEU 的三種補救做法。頁面改由 intune-flex-deploy 專案的 `build_site_page.py`
  從 `完整使用說明.html` 產生，不再手改
- **下架舊的路線 A／B 部署手冊**（html＋docx）與 `tools/build_docx.py`，內容已併入新說明
- **工具包 zip 更新**：含預檢腳本 `precheck.ps1`、「不註冊（沒買 CEU）」模式、正式部署確認改用自製對話框
- 字型子集補 4 個新字（抹、趕、韌、顛），字型 v36 → v44、CSS v64 → v65、fonts.css v28 → v29
- 修 `build-font.py`：unicode-range 改照產出檔實際字元寫。子集工具會順帶多留字元
  （這次是第 29 片多了全形 ］），照要求寫的話 `--check` 永遠對不上
- 修 `bump-asset-version.py`：納入 `assets/fonts.css`（內部的 woff2 版號）與工具頁的 `fonts.css?v=N`。
  之前漏掉，工具頁 preload 的字型版號跟 fonts.css 裡的分岔（v36 對 v35），同一個字型會抓兩次

## v1.6.2（2026-10-02）

依 Search Console 近三個月數據改善點閱率，並讓全站日期訊號一致。

- **Classroom 指南**：標題與描述開頭直接給登入網址 classroom.google.com，頁首加登入網址說明，
  常見問題補「登入網址是什麼、登不進去怎麼辦」。起因：classroom 相關查詢近三個月約 30 萬次曝光、排第 8 到 9 名，點閱率幾乎 0
- **AI 著作權**：新增「學生使用 AI 時，哪個行為沒有著作權」四個情境的考題解析（表格＋常見問題）。
  這題原文被搜尋 766 次、排第 2 到 6 名，但頁面原本沒回答
- **Google Flow、Vids、Gemini Notebook、Wordwall、Padlet**：描述開頭補官方網址（多為想找入口的導航型搜尋）
- **日期一致**：139 處 JSON-LD `dateModified` 與 sitemap `lastmod` 對齊（有畫面「最後更新」日期的以它為準，
  其餘取兩者較新），首頁改 2026-10-01。新工具 `sitemap/sync-dates.py`（`--check` 不一致離場碼 1）

## v1.6.1（2026-10-01）

首頁巡覽人物照改用 AI 示意圖。

- 巡覽 5 景（關於我們、服務項目、成功案例、網站效果、常見問題）依標題生成示意圖（`tour-ai-*.webp`），
  聯絡我們維持公司門口真實照。v1.6.0 的 2018 認證體驗班照片是老闆本人且年代太久，撤下
- 每景底部加小字「為保護隱私，此為示意圖」（網頁文字疊在圖上，不燒進圖裡；`landing.css` 的 `.ai-note`，手機版靠左避開浮動按鈕）
- 生圖不上傳真實照片當參考圖（避免 AI 照抄真人的臉），改用文字描述構圖
- 活動剪影（研習花絮）維持真實照片，不改

## v1.6.0（2026-10-01）

首頁加動態特效，巡覽照片換成真實研習照片。

- **平滑捲動（Lenis 1.3.26）**：自架 `assets/lenis.min.js`（gzip 後約 5KB），只接管滑鼠滾輪，手機觸控維持原生捲動；
  使用者系統設定「減少動態效果」時不啟用。搜尋框、手機選單內部自己捲，不被接管
- **巡覽改成鏡頭推進**：看過的那景放大淡出飛過鏡頭，下一景從稍遠處推近；下一景先在底下完整顯示，
  交接時不再兩張都半透明發灰
- **巡覽前 5 景換真實研習照片**（`tour-real-*.webp`，480／768／1024／1600 四種寬度）：Google 認證教育家體驗班、
  聖功女中、Google 101 學習之旅結業、樹人醫專、苗栗行動學習會議。第 6 景公司門口維持不變
- 選型理由：Vanta.js、ShaderGradient 要載 three.js（約 600KB），React Bits、ShaderGradient 要 React，
  與 v1.5.0 的速度改善衝突；GSAP 要重寫現有捲動程式。Lenis 最輕，且最能放大既有的捲動巡覽效果

## v1.5.0（2026-10-01）

全站體檢（Lighthouse 手機版、線上實測）後的速度與觸控舒適度改善。5 個代表頁平均效能分數 88 → 93：
首頁 81 → 92、服務頁 77 → 93、新文章 94 → 98、知識庫 93 → 92（持平）、關於 95 → 89（模擬分數，見下）。

- **字型改按需載入**：罕見字 `rest` 一整包 252KB 改依「出現在幾頁」切成 32 片（`hunglun-notosanstc-rest-NN.woff2`），
  各自宣告 `unicode-range`，頁面只抓用到字的那幾片。原因：單頁只用到其中約 9 個字也要整包下載，
  本機模擬手機網路，首頁 FCP 2.25 → 1.35 秒。每頁字型平均 545KB → 407KB
- **首屏 300 字進核心片**：每頁 `<main>` 開頭 300 字的用字一律放進 core（365KB，仍 preload），切片只負責首屏以下。
  先前純切片時首屏段落含冷僻字要等切片，模擬 LCP 被拖慢
- `build-font.py` 改寫成切片制（`REST_SLICES`、`FOLD_CHARS`），`--check` 驗證所有切片與 CSS `unicode-range` 一致；
  `bump-asset-version.py` 支援 `main`（main.js）並認得 `rest-NN` 檔名
- **首屏 `.reveal` 不再等淡入**：`main.js` 對載入時已在視窗內的元素直接顯示、略過 0.6 秒過場，
  服務頁首屏文字的「元素渲染延遲」約 1.1 秒
- 首頁第一張輪播圖改由 CSS 預設可見，不必等 `landing.js` 才顯示
- **手機觸控與小字**（`pointer:coarse`）：頁首選單／搜尋／深淺色鈕、頁尾複製鈕、浮動聯絡鈕、頁尾連結、
  麵包屑與服務頁錨點連結補到 44px；字級低於 12px 的頁尾標籤、日期、分類計數改 12px
- 頁尾複製鈕 `aria-label` 改成以畫面上的字「複製 ID」開頭（WCAG 2.5.3 Label in Name）
- 證書圖加 `object-fit: contain`，等高排列時不再被拉伸
- 已知量測假象：「關於」頁模擬 LCP 偏高，是因 core 字型剛好在首次繪製前抵達而被 Lighthouse 算進依賴，
  真實（不降速）LCP 約 1.0 到 1.1 秒，與改版前相同

## v1.4.0（2026-10-01）

- 新增科技觀察文章「Gemini 4 Argon 發表：先給網路防禦者，學校現在先看看就好」
  （`/insights/gemini-4-argon`）：整理 Google 9 月 30 日公告的規格、評測、價格與開放順序，
  判讀重點是目前只開給 Fairwind 計畫的網路防禦者，教育版完全沒有時程。含 NewsArticle／FAQPage／BreadcrumbList
- 科技觀察列表、sitemap、llms.txt、llms-full.txt、搜尋索引同步，新增專屬 og 圖
- 字型子集補「稅」，字型 v32、CSS v59

## v1.3.0（2026-09-29）

效能最佳化：首屏關鍵路徑從 543.9 KB 降到 309.0 KB（省 43%）。

- **自架字型拆成兩片**，這是全站唯一的效能瓶頸：原本單一 538 KB 的檔掛著 `preload`，
  佔首屏傳輸量的 96%，還會跟 CSS／JS 搶頻寬（首頁 HTML 壓縮後只有 7.8 KB、CSS 8.2 KB）。
  改成依「出現在多少頁」拆分：出現在 5% 以上頁面的 1126 個字進 core 片（293 KB，維持 preload），
  其餘 850 個罕見字進 rest 片（252 KB，只靠 `unicode-range` 宣告，不 preload、不阻擋算繪）。
  單頁落在核心外的字中位數只有 9 個，所以絕大多數頁面首屏只需要 core 片
- 新增 `assets/fonts.css`：只含兩條 `@font-face`，給 `tools/` 底下自成一套版型的
  獨立工具頁引用，它們不能套主站 `style.css` 但一樣該吃自架字型。由 `build-font.py`
  與 `style.css` 一起產生，`unicode-range` 不會兩邊分岔
- 4 個內部工具頁（ceu、flex-deploy、兩份部署手冊）移除 Google Fonts 外連，改用自架字型；
  JetBrains Mono 一併移除，退回系統等寬字（Cascadia Mono／Consolas）
- 修正 `font-weight: 800/900`（7 處）：字重軸只裁到 200–700，瀏覽器本來就把它們夾成 700，
  改成 700 只是讓程式碼說實話，畫面沒有任何變化
- `check-structure.py` 新增 `STANDALONE` 豁免：獨立版型的工具頁不再被要求套主站
  header／footer／skip-link（那 24 條是永遠不會修的假警報），但字型檢查照常適用。
  必修項目從 36 條降到 0
- `build-font.py --check` 加驗「`style.css` 的 `unicode-range` 與 rest 字型檔一致」：
  字型重建了但 CSS 沒跟著改的話，罕見字會被送去抓一個沒有那個字的檔，
  畫面上靜靜退回系統字型，肉眼幾乎看不出來
- `bump-asset-version.py` 補上 landing／tour／effects 三支 CSS 的版號目標

## v1.2.0（2026-09-25）
- 新增科技觀察文章「教育部 115 年數位與 AI 指引出爐：學校這學期先做這三件事」
  （`/insights/moe-ai-guidelines-115`）：整理教育部 115 年 9 月 10 日函公布的三份指引與
  三份學生手冊、跟 2024 年版的差別、與《中小學使用生成式人工智慧注意事項》2.1 版的分工，
  以及學校這學期可以先做的三件事。含 NewsArticle、FAQPage、BreadcrumbList 結構化資料與專屬分享圖
- 科技觀察列表、sitemap、llms.txt、llms-full.txt、搜尋索引同步收錄
- 字型子集補 7 個新字（詐、騙、霸、凌、孩、爐、舟），字型 v26 → v27、CSS v55 → v56

## v1.1.2（2026-09-25）
- 全站頁尾與內文的信箱加上 `<!--email_off-->`：Cloudflare 的信箱混淆會在邊緣把
  `mailto:` 與信箱文字改成 `/cdn-cgi/l/email-protection#…` 亂碼，不執行 JS 的爬蟲與
  AI 讀不到聯絡方式。9/20 只修了知識庫的寄信按鈕，這次補齊頁尾、聯絡頁、常見問題等
  149 頁共 158 處。新增 `sitemap/wrap-email-off.py`（冪等，`--check` 可接進交付前檢查）
- 知識庫 77 篇文章的麵包屑補上主題層（首頁 › 知識庫 › 主題 › 文章），畫面與
  BreadcrumbList 結構化資料同步；`knowledge/classroom` 原本沒有 BreadcrumbList，一併補上。
  新增 `sitemap/add-topic-breadcrumb.py`（主題對應直接讀 `gen-knowledge-topics.py`）
- `llms.txt` 補齊 sitemap 有但沒收錄的網址（6 個主題頁、3 個在地美食頁、21 個採購子頁），
  現在 145 個網址全數收錄；修正兩處過期敘述（知識庫「41 篇、四組」「25 篇」改為 76 篇、6 個主題）
- 5 個過長的標題縮短到約 35 個中文字以內，避免在搜尋結果被截斷
- 3 個主題頁的 description 補到 80 字以上；修正「資安與個資法遵」主題描述寫了
  不在該主題裡的「兩步驟驗證」
- `seo-audit.py` 修正誤報：noindex 頁（密碼保護的內部工具與講義）不列入體檢、
  `/api/` 路徑不算壞連結、主題頁改檢查 CollectionPage 而不是 Article

## v1.1.1（2026-09-20）
- 修正一處簡體字：科技觀察文章裡的「校園场景」改為「校園場景」
- 新增 `sitemap/check-simplified.py`：用簡繁逐字比對掃描全站有沒有混到簡體字，
  「一簡對多繁」而繁體本來就合法的字（核准、划算、占用、苗栗、虱目魚、濃郁）列入白名單，
  刻意保留的簡體字（照原樣引用軟體介面上的簡體瑕疵）用註解標記略過。有問題時離場碼 1
- 字型子集補上 27 個先前遺漏的字（傷、懸、揮、潔、籠、聆、錦、鎮等）。這些字原本會
  退回系統字型顯示，跟周圍文字的字形不一致；字型由 528KB 變為 536KB
- 把站上用到但 Noto Sans TC 本來就沒有的 emoji 列入字型檢查白名單，
  不再每次檢查都誤報成漏字
- 新增 `sitemap/bump-asset-version.py`：一次升全站的字型與 CSS 快取版號，
  不用一頁一頁手改（字型 v25 → v26、CSS v54 → v55）

## v1.1.0（2026-09-20）
- 知識庫主題分類從「假多頁」改成真正的多頁：原本 76 篇文章全塞在同一個網址，
  靠 JS 把不符分類的區塊設成 hidden、網址只改 `#hash`，搜尋引擎看到的永遠是同一頁。
  現在每個主題有自己的獨立網址（`/knowledge/topic/<主題>`），各自有 title、
  description、canonical、Open Graph、JSON-LD（CollectionPage 與 BreadcrumbList）
  與 h1，也都寫進 sitemap
- 主題從原本 7 類整併為 6 類（把 Gemini 教育版與 Gemini Notebook 併成同一主題）：
  Google 與 AI 導入 23 篇、Gemini 教育版與 Notebook 20 篇、數位學習軟體與網站 15 篇、
  Google Classroom 10 篇、設備選型與採購 4 篇、資安與個資法遵 4 篇
- 分頁列改用一般連結，沒有 JavaScript 也能切換主題；觸控高度 44px、字級 16px，
  手機版可左右滑動
- 新增產生器 `sitemap/gen-knowledge-topics.py`，可重複執行：文章清單直接讀
  `knowledge.html` 既有區塊，新增文章後重跑就會更新各主題頁與篇數
- 全站頁尾開始顯示版本號

## v1.0.0（2026-09-20 追認）
- 這是導入版本號之前的線上版本，內容涵蓋官網既有的 145 個頁面：公司介紹、
  Google 解決方案、服務項目、知識庫、科技觀察、台灣銀行共同供應契約採購頁、
  研習專區與各式工具頁
