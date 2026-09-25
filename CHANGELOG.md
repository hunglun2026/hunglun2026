# 更新紀錄

本網站的版本號採 SemVer（主.次.修）。單一來源是根目錄的 `VERSION` 檔，
頁尾顯示的版本號由 `sitemap/apply-version.py` 依該檔寫入全站頁面。

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
