# 更新紀錄

本網站的版本號採 SemVer（主.次.修）。單一來源是根目錄的 `VERSION` 檔，
頁尾顯示的版本號由 `sitemap/apply-version.py` 依該檔寫入全站頁面。

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
