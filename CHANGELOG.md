# 更新紀錄

本網站的版本號採 SemVer（主.次.修）。單一來源是根目錄的 `VERSION` 檔，
頁尾顯示的版本號由 `sitemap/apply-version.py` 依該檔寫入全站頁面。

## v1.31.2（2026-10-29）

首頁學習專區展示區排版修正。

- 加了兩棲探險家後變 10 個圖示，桌機一排放不下，排成 9＋1（小綸即時測驗落單）；桌機改限寬排成 5＋5，601～640px 圖示寬 100px 一樣是 5＋5，手機維持 3 個一排
- landing.css v34

## v1.31.1（2026-10-29）

全站健檢後的修正。

- 新增隱私權政策頁 `/privacy`（只寫實際有做的事：聯絡表單只寄給承辦同事不存資料庫、瀏覽人次只暫存雜湊 IP 5 小時、GA4 統計與 cookie、密碼頁 cookie 期限、怎麼拒絕 cookie）；全站頁尾加連結、sitemap、llms.txt
- 壞連結：會員集點系統 `antia-members.pages.dev` 網域已不存在，企業方案頁拿掉「前往體驗」與 JSON-LD url，會員文章延伸閱讀改連 /enterprise
- 數字：學習專區動物探險家卡片 271 → 270（動物站 API 實際 270），並改「動物園」少兩字，修掉手機與平板的孤字
- 無障礙：學習專區分類小標籤底色調深（color-mix 80%，白字對比最低 4.97）；首頁信任區文字裡的連結加底線（landing.css v33）；Flex 工具四頁可捲動表格、終端機、程式碼、示意圖加 tabindex、空表頭補隱藏文字、註冊工具頁補 role=main；表格欄位加 aria-label（table.js，已隨 v1.31.0 提交）；`intune-flex-deploy/build_site_page.py` 同步加 a11y()
- 速度：學習專區第一排三張截圖改為立即載入，第一張 fetchpriority=high（手機最大內容原本 3.0 秒）

## v1.31.0（2026-10-29）

學習專區新增兩棲探險家（frog.hunglun.com）。

- 學習專區：主題探險網站第 8 張卡片（放在植物探險家後面，分類「生物與自然」、程度國小），新圖示 `icon-proj-frog.webp`（同站 favicon）、截圖 `game-frog.webp`（首頁標題區 16:10）；分類分頁改「全部 10／主題探險網站 8」；說明文字改八個主題；ItemList 第 10 筆；分享圖重產 v7
- 首頁學習專區展示區加兩棲探險家圖示，說明改「8 個主題探險網站」
- llms.txt 加兩棲探險家（llms-full、搜尋索引在 v1.31.1 一起重產）
- 字型補「棲蛙」：字型 v82、style.css v115、fonts.css v42

## v1.30.1（2026-10-29）

安全修正：研習短連結（/go/<代碼>）的密碼不再寫在公開 repo。

- 原本講師總密碼、各場口令與講義網址寫在 `functions/go/_sessions.js`，公開 repo 任何人都讀得到；改存 Cloudflare Pages 加密變數 `GO_SESSIONS_JSON`、`GO_MASTER_PASSWORD`，`_sessions.js` 只留代碼與標題
- 舊密碼已在 git 歷史公開，總密碼與 6 場口令全部換新
- 變數讀不到或格式錯誤時回 503，不放行
- 研習專區講義頁（/tools/training/<slug>）的各篇密碼同樣移到加密變數 `GO_TOPIC_PASSWORDS_JSON` 並換新；內部工具中介程式改讀 `env.GO_MASTER_PASSWORD`（第一次推送漏改這裡，Pages 建置失敗，線上維持舊版，未影響使用）

## v1.30.0（2026-10-29）

學習專區與教學專區的分類都移到頁面上方。

- 學習專區：頁首下方加分類分頁「全部 9／主題探險網站 7／闖關遊戲 1／課堂即時測驗 1」，樣式同教學專區；點了只顯示該類，網址帶 #explore、#game、#quiz 可直接開某一類；沒有 JS 時是頁內連結
- 教學專區：主題分頁列從說明文字下方移到頁首正下方（跟各主題頁一致）
- 教學專區與 6 個主題頁的分頁列：桌機改成換行置中全部顯示（原本一排超出要橫向捲，加了教育科技觀察後 1440 寬會切掉兩顆），手機維持左右滑；產生器 gen-knowledge-topics.py 同步

## v1.29.1（2026-10-29）

- 學習專區頁副標在桌機寬度會把「即時」拆成兩行；改成三個不可拆開的片段，只在詞組之間斷行（1920 到 360 寬都量過）

## v1.29.0（2026-10-29）

主選單新增「學習專區」，給學生用的網站與遊戲從資源分享第三層升到第一層。

- 主選單「科技觀察」換成「學習專區」（連 /tools/games，網址不變）；科技觀察的 12 頁改亮「教學專區」；全站頁尾加「學習專區」連結，「教育科技觀察」連結保留
- 學習專區頁（原互動學習遊戲）改名並分三區：主題探險網站 7 個（動物、植物、海洋、昆蟲、故宮、古蹟、土石流）、闖關遊戲（邊玩邊變強）、課堂即時測驗（小綸即時測驗，新卡片與截圖 `games/game-livequiz.webp`）；拿掉篩選按鈕；標題、描述、麵包屑、ItemList（9 筆）、分享縮圖（`og/tools-games.png?v=6`）同步更新
- 教學專區：主題分頁列加「教育科技觀察」（由 gen-knowledge-topics.py 產生，篇數依 insights.html 自動數），文章清單上方加教育科技觀察區塊（最新 3 篇＋看全部）
- 首頁「客製化工具」後加學習專區展示區（9 個網站圖示＋看學習專區），`landing.css` v32
- 資源分享各頁分頁列與總覽卡片「互動學習遊戲」改名「學習專區」；新增短網址 `/learn`（301 到 /tools/games）
- llms.txt 補學習專區說明；llms-full、搜尋索引重產

## v1.28.1（2026-10-29）

修正學習遊戲頁頁首的浮動圖示。

- v1.28.0 加了第 7 個圖示（植物）卻沒給位置，它掉到正中間蓋住麵包屑；改成植物、土石流各放左右一個，維持左右各 4 個對稱
- 原本 1040～1230 寬度時第 2、5 個圖示就會壓到副標與分頁連結；逐寬度量過後，1240 以下不顯示浮動圖示

## v1.28.0（2026-10-29）

學習遊戲分類新增「植物探險家」（plant.hunglun.com），並重拍土石流小偵探的卡片截圖。

- 新增卡片：國小植物教學網站，用臺北市立動物園植物資料與台北植物園花曆觀察紀錄做，含植物小百科（100 種）、這個月開什麼花、植物分類、逛園區看植物、探險護照與老師專區；新增卡片圖示 `icon-proj-plant.webp` 與卡片截圖 `games/game-plant.webp`
- 土石流小偵探的卡片截圖重拍：舊圖畫面被放大、左右被切，上緣截到頁首分隔線、下緣切在半句話，放進卡片後分類標籤蓋住標題；改成內容完整入框、上下用頁面底色補成 16:10（`game-landslide.webp?v=2`）
- 學習遊戲頁描述（含 og、twitter）、ItemList（第 8 筆，numberOfItems 8）、教師與家長區塊、資源分享總覽、llms.txt 同步更新
- 字型補「植、蕨、裸」，字型 v80、CSS v114
- 搜尋索引與 llms-full 已重產

## v1.27.0（2026-10-27）

- 修正：首頁信任區拿掉「教育部國中小行動教育推動計畫指定廠商」，該頭銜沒有文件佐證，待公司提出指定函再決定要不要放回（about 頁原有自述未動）

依「碩陽搶生意」的策略討論（geminiA 十輪），先做最直接的兩項。

- 首頁在標題區與巡覽動畫之間加「信任區與職務分流」：只放已證實資歷（2017 年起官方授權教育夥伴、5 位認證講師與 2 位網域管理員、200+ 客戶、台銀共契與教育部行動教育計畫指定廠商），並依校長主任、資訊組長、採購總務主計、老師四種讀者分流到對應頁面，加「先試算授權套數」「直接來信洽詢」兩顆按鈕；樣式寫在 `landing.css`（v30）
- 新增文章 `/knowledge/change-google-reseller`（學校想換 Google 經銷商怎麼換）：依 Google 官方說明整理學校端 6 步、經銷商端 3 步、轉移前 6 項確認、帳單與資料影響、5 題 FAQ；內容不點名任何同業
- 知識庫、sitemap、llms.txt、主題頁、搜尋索引、llms-full、og 圖同步更新

## v1.26.0（2026-10-27）

學習遊戲分類新增「土石流小偵探」（landslide.hunglun.com）。

- 新增卡片：國小土石流防災教學網站，用農業部水保署的開放資料做，含看溪觀察站（64 支溪邊鏡頭的即時畫面）、臺灣地圖、認識溪流與前兆、我的鄉鎮（全臺 17 縣市的潛勢溪流）、防災闖關，老師專區有可列印學習單、全螢幕上課模式、搶答計分板與班級連結；新增卡片圖示 `icon-proj-landslide.webp` 與卡片截圖 `games/game-landslide.webp`
- ItemList 補第 7 筆，numberOfItems 改 7；學習遊戲頁描述（含 og、twitter）補上土石流；「給教師與家長的功能」補上土石流小偵探
- 資源分享總覽的學習遊戲說明、llms.txt 同步更新
- 搜尋索引與 llms-full 已重產

## v1.25.0（2026-10-27）

學習遊戲分類新增「古蹟探險家」（heritage.hunglun.com）。

- 新增卡片：幼兒園到高中的臺灣古蹟教學網站，收錄 1,065 處古蹟，含古蹟圖鑑、地圖找家附近的古蹟、看建築認類型、時代排排看、猜猜我是誰、翻牌配對、探險護照與老師專區；新增卡片圖示 `icon-proj-heritage.webp`
- 學習遊戲頁描述（含 og、twitter）補上古蹟；資源分享總覽的學習遊戲說明、llms.txt 同步更新
- 修 ItemList：昆蟲探險家原本誤放在 BreadcrumbList（position 5），ItemList 實際只有 4 筆；現在移回 ItemList 並補第 6 個，numberOfItems 改 6
- 字型補「塔、宅、寺」，字型 v75、CSS 版號同步升
- 搜尋索引與 llms-full 已重產

## v1.24.0（2026-10-26）

補完 Gemini 建議裡上一版沒做到的部分（一般企業分流、工具獨立頁、Lead Magnet、試算器）。

- 新增 `/enterprise`（企業與公部門數位方案）並在全站導覽列加「企業方案」，教育與企業分流：Google 雲端與 Gemini 企業導入、客製系統與自動化整合、品牌官網與搜尋曝光、客戶案例、網站互動效果範例整區搬到這裡；頁面用 Service＋OfferCatalog 結構化資料；服務項目頁拿掉「網站效果」分頁與一般企業案例，只留一張入口卡；舊網址 `/services#effects` 會轉到新頁。既有 `/services/*` 單頁網址不動（保護已收錄連結），以企業專頁彙整與結構化資料區分
- 新增兩個工具獨立介紹頁：`/tools/consent-slip-ai`（學生回條 AI 辨識系統）、`/tools/photo-word`（校園照片 Word 填入工具），各含重點摘要、FAQ、SoftwareApplication 結構化資料與「複製推薦信給資訊組長」
- 新增 `/knowledge/gemini-prompt-kit`：Gemini 備課與校務提示詞 30 組（Word＋PDF），填學校、姓名、信箱後才顯示下載連結，資料走 `/api/contact`；產生器 `sitemap/gen-prompt-kit.py`；8 篇決策型文章文末加下載入口
- 報價頁試算器：補「複製試算結果」與經費來源說明（不編價格）
- sitemap、llms.txt、og 圖同步

## v1.23.0（2026-10-26）

依 Gemini 對官網的 SEO／AEO／GEO 建議，查證後只做站上真正缺的四項，另把一般商業業務降級。

- Organization（首頁、關於）：補 `taxID` 與 Google 官方亞太服務文件的 `sameAs`；關於頁公司沿革補登記資料
- 商業業務降級（不移除、不搬頁，避免斷掉 `/services#cases` 等已收錄連結）：首頁巡覽拿掉「網站效果」面板（圓點與高度同步）、服務分類「官網與數位行銷」排最後；服務頁同樣排最後，成功案例拆成教育工具與「客戶委託案例（一般企業）」兩段
- 9 篇決策型文章補「重點先看」摘要框（`kb-quick`）：google-ai-pro-vs-workspace、education-apply、gemini-notebook-plans、gemini-faq-limits、chromebook、school-ai-procurement、workspace-editions、procurement、gemini-admin-setup
- 兩份採購規格書範本（Word＋PDF）：`assets/docs/spec-google-ai-pro.*`、`spec-chromebook-ceu.*`，下載區放在 school-ai-procurement 與 procurement 兩篇；產生器 `sitemap/gen-spec-templates.py`（沿用 gen-ai-policy-template.py）
- `gen-ai-policy-template.py` 的 `build_pdf` 修正：等 Chrome 寫完 PDF 才清暫存資料夾（原本偶爾產不出 PDF）
- 報價頁新增授權套數試算器（只算數量、不含價格），可一鍵帶入下方表單的人數與備註
- 查證結論：FAQPage（150 頁）、SoftwareApplication（24 個）、靜態 HTML、無測試機網域，Gemini 說缺的都已經有

## v1.22.2（2026-10-25）

拿掉「CEU 綁定與解除系統」自動綁定程式（商用工具）。

- `tools/commercial`：刪卡片，三處描述改掉 CEU 字樣；`tools`、`llms.txt` 的商用工具說明同步
- 刪除自動綁定程式本身：`tools/ceu.html` 與後端代理 `functions/tools/ceu/api/`；`services/ceu` 服務頁、各文章提及 CEU 的地方、`_middleware.js` 不動
- 搜尋索引與 llms-full 已重產

## v1.22.1（2026-10-25）

拿掉全站對政府資料來源的標註（機關名稱與入口）。

- `knowledge/opendata`：刪「開放資料要去哪裡查詢或下載？」問答（頁面與 FAQPage 結構化資料各一則），並拿掉點名的資料種類
- 官網各頁、資料查詢網站、學習遊戲、llms.txt：拿掉衛福部、食藥署、農業部、教育部統計處、動物園、故宮、海生館、林業試驗所、iNaturalist 等「資料來自誰」的說法，「政府開放資料」統一改「公開資料」；產品名稱不動
- FAQ「藥品資料來自哪裡」改問「會自動更新嗎」
- 搜尋索引與 llms-full 已重產

## v1.22.0（2026-10-22）

學習遊戲分類新增「昆蟲探險家」（insects.hunglun.com）。

- 新增卡片：用林業試驗所昆蟲標本館開放資料、臺灣物種名錄與 iNaturalist 觀察照片做的國小到高中台灣昆蟲教學網站；新增卡片圖示 `icon-proj-insect.webp`
- 學習遊戲頁描述（含 og、twitter）補上昆蟲探險家；ItemList 補第 5 個；資源分享總覽的學習遊戲說明同步更新；llms.txt 補上昆蟲探險家
- 搜尋索引與 llms-full 已重產

## v1.21.1（2026-10-22）

- 海洋探險家正式網址改成 ocean.hunglun.com（舊網址 sea.hunglun.com 已整站 301 轉址）：學習遊戲頁卡片、ItemList、llms.txt 連結同步更新；搜尋索引與 llms-full 重產

## v1.21.0（2026-10-22）

學習遊戲分類新增「海洋探險家」（sea.hunglun.com）。

- 新增卡片：以國立海洋生物博物館展館與特展為主題、用政府開放資料做的幼兒園到高中海洋生物教學網站；新增卡片圖示 `icon-proj-sea.webp`
- 學習遊戲頁描述（含 og、twitter）與頁首說明改成「幼兒園到高中」並補上海洋探險家；ItemList 補第 4 個；資源分享總覽的學習遊戲說明同步更新；llms.txt 補上海洋探險家
- 搜尋索引與 llms-full 已重產

## v1.20.0（2026-10-22）

依 GSC 近三個月資料改善搜尋結果的點擊率：
- 21 頁標題縮短到 Google 搜尋結果放得下的長度（原本超過約 30 字被截成「…」），查詢字放前面，例如「Gemini 4 Argon 可以用了嗎」「Gemini Notebook 用法教學」。h1 與標題相同的頁一起改，列表、結構化資料、交叉連結同步；流量最大的 gemini、google-ai-pro-for-education、gemini-free-for-teachers-students 不動。
- 分享預覽圖產生器改成只在標點、空白、左括號前斷行，標點不放行首，不再把詞從中間切開；全站 172 張重產，OG_VER 5。
- 教學專區與觀察列表標題（`.kn-t`）改成第一行排滿、只在空白與標點斷行（style.css v104、v105）。
- sync-dates 修正 134 處 dateModified 與 sitemap lastmod 不一致。

## v1.19.4（2026-10-22）

補產生資源分享最後三個分類頁的分享預覽圖：`assets/og/tools-admin.png`、`tools-campus.png`、`tools-local-food.png`（10-19 拆頁後一直 404）。全站掃過 og:image 與 twitter:image，已沒有指到不存在檔案的頁面。

## v1.19.3（2026-10-22）

內頁標題區拿掉毛玻璃泡泡，恢復原本的米白底置中標題（泡泡不符合專業形象）；style.css v103。

## v1.19.2（2026-10-22）

內頁標題泡泡改版：四色光暈移到泡泡邊緣後方、顏色加深並慢慢漂移（減少動態時不播），泡泡更透明並加亮邊與內側高光；短標題區改完整水滴形；style.css v102。

## v1.19.1（2026-10-22）

內頁標題區改成毛玻璃泡泡：後面加 Google 四色柔光，標題、麵包屑與說明放在不規則圓角的霧面框裡，深色模式另配暗色版；style.css v101。

## v1.19.0（2026-10-22）

學習遊戲分類新增「故宮探險家」（museum.hunglun.com）。

- 新增卡片：用國立故宮博物院開放資料做的國小到高中文物教學網站，含猜朝代、朝代排排站、史料探究與老師專區；新增卡片圖示 `icon-proj-museum.webp`
- 學習遊戲頁描述（含 og、twitter）與頁首說明改成「國小到高中」並補上故宮探險家；資源分享總覽的學習遊戲說明同步更新
- 順手修 ItemList：原本只列邊玩邊變強、numberOfItems 寫 7，現在列出三個遊戲、改為 3；llms.txt 補上動物探險家與故宮探險家
- 補產生學習遊戲頁的分享預覽圖 `assets/og/tools-games.png`（10-19 拆頁後一直 404）
- 搜尋索引與 llms-full 已重產；sitemap 的 /tools、/tools/games lastmod 更新

## v1.18.1（2026-10-22）

「全國學校人數查詢」（school.hunglun.com）從資料查詢網站移到商用工具。這個站有密碼閘門，是內部推廣 Google AI Pro for Education 用的。

- 商用工具頁新增卡片，頁面描述（含 og、twitter）補上學校人數查詢；資料查詢頁拿掉卡片與 ItemList 那一筆，標題與描述只剩藥品許可證、動物用藥
- 資源分享總覽兩個分類的說明、llms.txt 同步更新；搜尋索引與 llms-full 已重產；sitemap 的 /tools、/tools/commercial、/tools/data-search lastmod 更新
- 順手修掉商用工具、資料查詢兩頁 og:title、twitter:title 多出來的引號，資料查詢 ItemList 的 numberOfItems（寫 7、實際 3，現為 2）；補產生這兩頁的 og 圖（原本 404）
- 學校人數查詢站頁首頁尾的「更多資料查詢」改成「更多商用工具」，連到 /tools/commercial

## v1.18.0（2026-10-21）

校園小工具新增「小綸即時測驗」（quiz.hunglun.com）與「課堂遊戲工坊」（classgames.hunglun.com）。

- 新增兩張卡片與 ItemList 結構化資料；新增卡片圖示 `icon-proj-livequiz.webp`、`icon-proj-classgames.webp`
- 校園小工具頁標題、描述（含 og、twitter）、頁首說明補上即時測驗與課堂遊戲；資源分享總覽同步更新
- 順手修掉校園小工具頁 og:title、twitter:title 多出來的一個引號，以及 ItemList 的 numberOfItems（寫 7、實際 4，現為 6）
- llms.txt 補兩個工具；搜尋索引與 llms-full 已重產；sitemap 的 /tools、/tools/campus lastmod 更新

## v1.17.0（2026-10-21）

學習遊戲分類新增「動物探險家」（zoo.hunglun.com）。

- 新增卡片：用臺北市立動物園開放資料做的國小動物教學網站，含分類闖關、猜謎、保育小教室與老師專區（可列印學習單、搶答計分板）；新增卡片圖示 `icon-proj-zoo.webp`
- 學習遊戲頁改成標準雙欄卡片版型，頁面描述（含 og、twitter）補上動物探險家
- 順手修掉學習遊戲頁 og:title、twitter:title 多出來的一個引號
- 資源分享總覽的學習遊戲說明同步更新；搜尋索引與 llms-full 已重產

## v1.16.1（2026-10-21）

「數位札記」改名「教學專區」。「札記」帶文學語氣，老師與資訊組不會這樣搜（GSC 近三個月查詢沒有人搜過）；站上實際查詢以「教學」「怎麼用」「是什麼」類為主，所以用「教學專區」。

- 畫面文字全站改：導覽、麵包屑、BreadcrumbList、頁尾、搜尋框提示、主題頁標題（例：Google Classroom 教學專區）；網址 `/knowledge` 不動、各篇網址與 lastmod 不動
- 分享預覽圖 172 張重產，`OG_VER` 升到 4
- 本機產生器（gen-knowledge-topics／hub／search-index、add-topic-breadcrumb）同步改名；主題頁、站內搜尋、llms-full 已重產

## v1.16.0（2026-10-21）

用 Search Console 近三個月查詢（1,000 組）檢查後，只補「站內完全沒有對應頁」的題目，不為湊篇數新增會互搶排名的頁面。

- 新增 `knowledge/intune-for-education`：Intune 是什麼、Intune for Education 差在哪、能管哪些裝置、授權與導入前要確認的事，以及和 Google 管理主控台怎麼分工；依 Microsoft Learn 官方文件整理（查詢「intune」「intune是什麼」合計約 650 曝光，原本站內無專頁）
- 新增 `knowledge/school-account-after-graduation`：學校 Google 帳號畢業後還能用嗎、停用與刪除差別、用 takeout.google.com/transfer 轉出資料、哪些轉不走、帳號被刪怎麼辦；轉移範圍依 Google 管理員說明（2026-10-13 更新）；與管理員視角的 `account-lifecycle` 互相導流（相關查詢合計約 350 曝光）
- 評估後不新增：Chromebook 缺點、AI 素養著作權考題、Gemini 看不到，站內已有對應段落（`chromebook`、`ai-copyright`、`gemini-faq-limits`），新增只會互搶排名
- 評估後不改寫：Padlet／Wordwall／Kahoot／Chromebook／Flow 標題與描述已含查詢詞，低點擊來自排名與查詢本身，不盲改
- 數位札記 89 篇改 91 篇；主題頁、sitemap、llms.txt、llms-full、站內搜尋、分享預覽圖都已更新
- 修正 `insights/gemini-4-argon`：FAQPage 結構化資料第 2 答漏了頁面結尾「完整整理見 Gemini 4 Argon 老師能用嗎」，與頁面文字補成一致
- `sitemap/ld.py`：實測區塊（`faq-item is-demo`）不算 FAQ，與 `seo-audit.py` 的約定一致，不再誤報 `gemini-4-argon-teachers` 題數不符
- 字型子集重建：補進 23 個新字（來自 Argon 實測文與 tools 頁，不補會退回系統字型），字型版號 ?v=67、style.css ?v=99
- `assets/main.js`：兩個判斷中文字的範圍正規式改寫成 Unicode 跳脫碼，功能不變，只讓字型檢查不再把範圍端點當成要顯示的字

## v1.15.0（2026-10-16）

依「增加曝光」討論（與 Gemini 帳號 A 共 15 輪）做的站內調整，加一篇 Gemini 4 Argon 新文章。

- 新增 `knowledge/gemini-4-argon-teachers`：Gemini 4 Argon 老師能用嗎？依 Gemini 官方更新日誌（10/13）、API 文件與 9/30 公告，整理 4 種帳號的可用性；官方沒寫的一律標「官方未說明」，建議標明是站方看法；附 5 個老師 15 分鐘實測題，其中成績分析與應用題附驗算過的標準答案
- 修正舊文 `insights/gemini-4-argon`：原寫「只開給網路防禦者」已過時，改為 9/30 與 10/13 兩段，並加更新方框連到新文；卡片、llms.txt、站內搜尋同步
- `knowledge/gemini-flow-howto`：標題改「6 步驟」，補上步驟清單、Flow 與 Vids 比較表、兩題 FAQ（內容只用頁面原有已查證事實）
- `knowledge/classroom`：標題加「首頁」「登不進去怎麼辦」、meta 重寫、第一屏加常見卡關捷徑與常見拼法一句話；不合併頁面、不轉址
- `knowledge/student-ai-policy`：新增填空範本下載（Word 可編輯＋PDF，含家長知悉回條），產生腳本在 `sitemap/gen-ai-policy-template.py`
- 數位札記 88 篇改 89 篇；主題頁、sitemap、llms.txt、llms-full、站內搜尋、分享預覽圖都已更新

## v1.14.1（2026-10-16）

排版健康檢查：修掉全站斷行與段落間距問題，並把偵測方法加進檢查腳本，以後同類問題會自動抓到。

- 斷行：清單、卡片內文原本套 `text-wrap: balance`，多行時整段被擠成窄條、詞從中間切開（例：「授／權」「計／畫」）。balance 改為只用在標題、按鈕、表格；清單與卡片內文回到一般折行，最後一行只剩兩個字的地方（約 18 處）用 `.nowrap` 把結尾綁住
- 首頁頂端小標在手機會切成「GOOGLE FOR／EDUCATION」，改成手機刻意分兩行；麵包屑的每一層不再從中間斷開；聯絡頁副標依詞組換行
- 段落間距：8 篇沒包 `.prose` 的文章（OCR、資料盤點、學生 AI 規範等），標題、段落、清單之間原本完全沒有間距，補上
- 無障礙：系列導覽、清單、卡片內文的連結加底線（原本只靠顏色區分）；文末系列導覽改名「（文末）」，和文章開頭那個區分
- 文字：8 篇文章的「的10 件事」這類單邊空格統一成「的 10 件事」
- `sitemap/check-linebreak.py` 新增「行沒填滿」：中間某行還空很多字就換行、而下一行開頭是中文時回報（標題、表格、麵包屑、刻意綁住的片語不算），並排除收合中的常見問題答案

## v1.14.0（2026-10-14）

依熱門搜尋新增三篇數位札記（GSC 近三個月查詢加 Google 自動完成，找「大家實際打的問法」但站內沒有專頁的題目）。

- 新增 `knowledge/google-flow-credits-taiwan`：Flow 免費額度（未訂閱每天 50 點）、各方案每月點數、台灣開放與 18 歲限制（來源：Google Flow 說明中心）。學校教育版帳號能否使用，官方沒寫，文中明講無法確認
- 新增 `knowledge/google-vids-education-limits`：官方表格逐項列出 Fundamentals／Standard／Plus／Teaching and Learning／AI Pro for Education 在 Vids 的 Gemini 功能與每月額度（來源：Google Docs 編輯器說明，英文版與繁中版對照）
- 新增 `knowledge/ai-quiz-generator-for-teachers`：學校 Google 帳號出題的四種做法比較（內容整理自站內已查證文章，不評民間工具）
- 修正舊文：`gemini-flow-howto`、`gemini-vids-howto`、`gemini-faq-limits` 的 Flow 額度與 Vids 方案說法已過時（Flow 改為每天 50 點加各方案每月點數，Vids 的 AI 功能依教育版本而異），並互相加上連結
- 數位札記 85 篇改 88 篇；主題頁、sitemap、llms.txt、llms-full、站內搜尋、分享預覽圖都已更新

## v1.13.2（2026-10-10）

草稿，待 Steve 審閱。新增科技觀察 /insights/gemini-student-hub：Gemini 學生專區（10 月 1 日）開放給所有年齡的教育版使用者。

- 重點：受 Gemini 應用程式的生成式 AI 設定控制、沒有獨立開關；免費一年方案是給大專學生個人，台灣資格無法確認
- 出處：Workspace Updates（2026-10-01）、Google 官方部落格（2026-08-19）
- insights.html、sitemap、llms.txt、llms-full、search-index、OG 圖同步更新
- 字型子集補「歐」字（font ?v=63、css ?v=80）

## v1.13.1（2026-10-09）

CEU 型錄加浮水印，避免內容被整份拿去用。

- /services/ceu 兩張表上疊一層斜排半透明「鴻綸科技 www.hunglun.com」（CSS，點不到、不影響選字與搜尋引擎）
- PDF 型錄每頁加浮水印（`sitemap/watermark-pdf.py` 從未加印的原始檔產出），下載連結升 `?v=2`

## v1.13.0（2026-10-08）

新增服務頁 /services/ceu「ChromeOS 教育升級版（CEU）型錄」（只放教育版）。

- 內容照型錄 PDF：品項規格、CEU 管理功能兩張表與附註，可下載 PDF（/assets/docs/ceu-catalog.pdf）
- 入口：/services 與 /google 加卡片；chromebook、chromeos-flex 兩頁內文連結與上一頁／下一頁接到 CEU 頁
- sitemap、llms.txt、llms-full、search-index、OG 圖同步更新
- 字型子集補「潛」字（font ?v=61、css ?v=79、fonts.css ?v=34）

## v1.12.1（2026-10-08）

草稿，待 Steve 審閱。更新科技觀察 /insights/gemini-image-watermark：SynthID Detector（synthid.com）10 月 7 日開放所有人使用。

- 新增「後續：10 月 8 日更新」小節：可查來源（Google、OpenAI、NVIDIA、Kakao，Apple 即將加入）、跟 Gemini 內查驗的差別、「查不到不等於真的」、學校建議四點
- FAQ「怎麼查一張圖是不是 Gemini 生成的？」補上 SynthID Detector（可見問答與 JSON-LD 同步）；資料來源補 DeepMind 部落格與說明中心
- 字型子集補「臉」字（font ?v=59、css ?v=78）

## v1.12.0（2026-10-06）

全站斷行、標點、留白在手機／平板／電腦三種寬度徹底檢查，並全站移除 Google Workspace for Education Standard 品項。

- 斷行：內文避免最後一行只剩一兩個字，標題、表格、清單、麵包屑、按鈕各行長度平均；清單拿掉 `word-break: keep-all`（標點會被擠到行首）；表格每格至少 5 字寬，電腦版第一欄不再強制不換行（長句會把其他欄擠成一字一行，/knowledge/ai-copyright 原本就壞）；程式碼字型的中文改接 Noto Sans TC
- 標點：圖說與說明補句號、清單句尾統一、半形括號改全形、原始碼中文換行造成的多餘空格移除
- 留白：文章結尾按鈕框與詢問框之間、區塊開頭標題的上邊距、清單項目間距收斂；首頁直向螢幕（手機、平板）首屏與照片上方留白縮小
- 修正 /knowledge/gemini-notebook-updates 頁首兩個 meta 標籤壞掉、畫面露出「P26 最新異動…">」（9/14 起）
- 移除 Education Standard：版本比較表、教育部選購名單序號 1152-0281、Google 產品圖卡、30 頁文章與 llms.txt 內的提及
- 新檢查工具：`sitemap/check-linebreak.py`（三寬度斷行）、`sitemap/check-punct.py`（標點）；`check-whitespace.py` 先載入延遲載入圖片再量、可指定寬度

## v1.11.2（2026-10-06）

`/tools` 更正收費說明：研習專區是付費研習的學員專用，其他工具全部免費。

- 頁首說明原本寫「全部免費開放使用」，改成「研習專區為付費研習的學員專用，其他工具全部免費開放使用」
- 網頁標題、搜尋描述、分享描述、結構化資料、llms.txt 同步改正，不再寫「免費研習講義」
- `/tools` 系列 3 張分享預覽圖重產

## v1.11.1（2026-10-06）

Flex 部署工具：新增 Word 版使用說明書。

- `/tools/downloads/ChromeOS-Flex-兩條路線操作說明.docx`：路線 A（Intune＋Surface Go）與路線 B（一般 Windows）完整操作說明，34 頁
- `/tools/flex-deploy`、`/tools/flex-deploy-intune`：頁首加「Word 使用說明書」下載按鈕
- 工具包 zip 內附 `使用說明書` 資料夾

## v1.10.3（2026-10-06）

Flex 部署工具更新（工具包與 Intune 手冊）。

- 工具包：Intune 安裝包檔名自動標明模式（`flex-DRYRUN-…`／`flex-REAL-wipes-windows-…`），模擬版與正式版不再互相覆蓋
- 工具包：區網直接部署改跑與 Intune 相同的安裝腳本，等結果並回報每台的結束代碼
- 工具包：模擬沒產生記錄時不放行（新代碼 23），沒有記錄器的安裝包不給打包
- `/tools/flex-deploy-intune`：打包步驟改成自動命名、代碼表補 23
- `/tools/flex-deploy-intune`：修正打包步驟一個亂碼字元、應用程式欄位表的檔名；`/tools/flex-deploy`：區網部署的記錄範例改成新格式

## v1.11.0（2026-10-06）

依熱門搜尋新增三篇數位札記，Gemini Notebook 入口頁標題補上舊名 NotebookLM。

- 新增 `knowledge/ai-literacy-certification`：AI 素養級認證（AIATCL）2.0 版考試範圍、及格標準、報名費與場次，並比較 Google 認證教育家（來源：台灣人工智慧學校 aiatc.tw）
- 新增 `knowledge/gemini-free-for-teachers-students`：老師用學校帳號免費用 Gemini、學校帳號額度、大學生免費 AI Plus 一年、對話記錄保留規則（來源：Gemini 說明中心、Google 官方部落格 2026-08-19）
- 新增 `knowledge/student-tablet-program-2026`：生生用平板方案結束後的 115 年數位學習實施計畫、載具每年汰換 25%、Googlebook 對 Chromebook 採購的影響（來源：行政院、教育部、國教署、Google 說明中心）
- 數位札記 82 篇改 85 篇；主題頁、sitemap、llms.txt、llms-full、站內搜尋、分享預覽圖都已更新
- `gemini-notebook-intro`、`-howto`、`-series` 網頁標題加「（原 NotebookLM）」
- 字型補 10 字，字型 v57、CSS v76

## v1.10.2（2026-10-06）

手機版選單置中、全站空白過多修正。

- 手機版（1280px 以下）展開選單改成置中排列
- 新增 `sitemap/check-whitespace.py`：以手機寬度量每頁內容之間的空白，抓到 85 處超過 120px
- 文章結尾詢問框是區塊第一個元素時，不再疊加 48px 上邊距（85 處降到 5 處，剩下的是正常區塊分隔與標誌框）
- `/software`：Kahoot 標誌原本誤放在 Wordwall 說明圖前面，移回 Kahoot 標題上方；手機版標誌上邊距 52px 改 36px
- `knowledge/gemini`：「練習下指令用個人帳號沒問題」補上 10 月 9 日起個人免費帳號只剩 Flash-Lite，連到新文章
- CSS v75

## v1.10.1（2026-10-06）

科技觀察新增一篇（草稿，待 Steve 審閱）：Gemini 免費個人帳號 10 月 9 日起只剩 Flash-Lite。

- 新文章 `insights/gemini-personal-account-model-changes`：個人帳號各方案模型對照、學校帳號額度（10 月 6 日查詢）、給學校的三項建議，出處為 Gemini 說明中心兩份官方說明頁
- `insights.html` 列表與 ItemList、`sitemap.xml`、`llms.txt` 加入新文章；重產分享預覽圖、`llms-full.txt`、`search-index.json`

## v1.10.0（2026-10-06）

「知識庫」改名為「數位札記」，網址 `/knowledge` 不變；robots.txt 補上新的 AI 爬蟲。

- 全站導覽列、頁尾、麵包屑（含 BreadcrumbList 結構化資料）、索引頁標題與描述、站內搜尋分類、llms.txt／llms-full.txt 一起改名
- 六個主題頁標題改成「Google Classroom 教學札記」這種寫法
- 文章裡指 AI 知識庫功能的句子（例如課綱知識庫、持續累積的知識庫）照原文保留
- 數位札記 90 張分享預覽圖重產，引用改 `?v=3`
- 字型子集補「札」，字型 v55、CSS v74
- robots.txt 補 Claude-SearchBot、Claude-User、Applebot、Applebot-Extended、Meta-ExternalAgent、DuckAssistBot、Amazonbot、MistralAI-User、Google-CloudVertexBot

## v1.9.2（2026-10-05）

教育部產品序號改連到教育部選購名單網站的該產品頁，並移除未販售的品項。

- `/software` 對照表移除「Google 英語練習學習包 1152-0288」
- 13 個品項的產品名稱（對照表）與編號（全站各處標籤、圖卡頁）都改連到 `sdc.org.tw/115-118/product/…`，新分頁開啟；每個連結都逐一抓進去核對過該頁顯示的「產品序號」相符才採用
- 樣式修正：`.moe-code` 內只有連回對照表的連結靠右，編號連結不受影響；CSS v73

## v1.9.1（2026-10-05）

分享預覽圖（LINE、Facebook 轉傳連結時顯示的縮圖）由深藍底改成淺色版。

- 全站 154 張 `assets/og/*.png` 重產：白底、上緣 Google 四色條、官方 lockup 標章，標題深色字；舊深色版可用 `gen-og-images.py --dark` 重產
- 各頁 `og:image`、`twitter:image` 網址加 `?v=2`，讓社群平台抓新圖（換圖時 `OG_VER` 加一）

## v1.9.0（2026-10-05）

搜尋與 AI 搜尋（Google、Perplexity、ChatGPT 搜尋等）排名與被引用的基礎工作。

- **結構化資料全部對齊**（`ld.py` 由 29 項紅字到全部一致）：22 頁（採購類 20 頁、`google/intune`、`google/ai-pro-campus`）原本 FAQPage 有題目但頁面看不到，違反 Google 規定，改為在頁面補出可見的「常見問題」區塊，文字與結構化資料逐字相同；`ai-copyright` 題序、`gemini-notebook-expert-intelligence` 引號、`chromeos-flex` 第 3 答連結文字對齊
- **「重點先看」摘要區塊**（新樣式 `.kb-quick`，`data-quick-answer`）放在三篇主文最前面：`knowledge/gemini`、`knowledge/google-ai-pro-for-education`、`knowledge/google-ai-pro-for-education-cost`，只用文中既有事實，先給答案方便搜尋摘要與 AI 引用
- `knowledge/gemini` 標題加入「教師」（對應「gemini 教師 免費」「gemini 教師 方案」等實際搜尋字）
- 確認 PerplexityBot、Perplexity-User、GPTBot、ClaudeBot 以爬蟲身分都能抓到完整頁面（robots.txt 本就放行，Cloudflare 沒有擋）
- CSS v72

## v1.8.5（2026-10-05）

教育部選購名單的標示只留產品編號，不再顯示廠商與梯次。

- 全站產品旁的小字說明移除（`/software`、服務頁、知識庫 8 篇共 14 處）
- `/software` 對照表只留「產品」與「產品序號」兩欄，並刪去說明段落中的相關句子
- 圖卡圖上的相關字樣與標籤移除，圖卡圖檔引用升為 `?v=3`
- 更新紀錄中 v1.8.1 的相關描述同步改寫

## v1.8.4（2026-10-05）

六張產品介紹圖卡的右側示意圖，由簡化圖形換成 Gemini 生成的扁平插畫（Kahoot 課堂、Padlet 協作牆、Wordwall 遊戲、ThingLink 環景、Google 整套、Flex 部署）。

- 插畫由 geminiA 一次批次生成（同一串對話風格一致，已確認無浮水印、無亂碼文字），原圖放內部資料夾 `hunglun2026-內部資料\cards-art\`，產圖腳本自動裁白邊後排進圖卡
- 圖卡圖檔引用加 `?v=2`，避免長快取讓人看到舊圖

## v1.8.3（2026-10-05）

產品介紹圖卡：做成鴻綸自己的版本（版面、文案、配色原創），每張附教育部選購名單產品編號，可下載轉傳。

- **新頁 `/software/cards`「產品介紹圖卡」**：Kahoot（1152-0300）、Padlet（1152-0289）、Wordwall（1152-0031）、ThingLink（1152-0097）、Google 教育版全系列、ChromeOS Flex（1152-0286）六張，每張可下載 1080×1080 原圖與複製分享文字；`/software#moe` 表格上方加連結
- **各產品原位放縮圖**（點圖進總覽頁）：`/software` 的 ThingLink／Padlet／Wordwall／Kahoot 區塊、Google Workspace 與 Google AI Pro 服務頁（Google 套組卡）、ChromeOS Flex 服務頁（Flex 卡）
- **`/services/chromeos-flex` 新增文字小節「遠端大量部署」**：Intune 推送與遠端指令推送兩條路、整批部署流程（對機型、先模擬、小批試點、分批轉換、序號對帳、集中管理）與不可逆提醒；只寫「提供」與做法，不寫已部署台數
- 產圖腳本 `sitemap/gen-product-cards.py`（HTML 排版→Playwright→PNG／WebP，改文案重跑即可；`sitemap/` 在 gitignore，只在本機）；新樣式 `.pc-thumb`、`.pc-grid`、`.pc-item`
- Wordwall 沒有可用的乾淨 logo 檔（現有 webp 無透明通道、黑底有雜訊），圖卡標題改用純文字產品名
- CSS v71；接進 sitemap、llms.txt、llms-full、搜尋索引與專屬分享圖

## v1.8.2（2026-10-05）

各產品自己的知識庫文章也加上教育部選購名單產品序號，讓只看單篇文章的採購人員也看得到。

- 8 篇加序號標籤（連到 `/software#moe` 完整對照表）：ThingLink、Padlet、Kahoot、Wordwall、Adobe 教育授權、Workspace 版本比較、Google AI Pro for Education 是什麼與費用兩篇
- 這 8 篇的 dateModified、最後更新與 sitemap lastmod 同步改為 2026-10-05

## v1.8.1（2026-10-05）

產品加註教育部「校園數位內容與教學軟體」選購名單產品序號（編號逐筆對照官方 ODS 名單）。

- **`/software` 新增「教育部選購名單產品序號對照」**（`#moe`）：14 個品項的產品序號
- **產品旁加序號標籤**（新樣式 `.moe-code`）：ThingLink 1152-0097、Padlet 1152-0289、Wordwall 1152-0031、Kahoot EDU Standard 教師版 1152-0300、Adobe K12 教育版 1152-0270
- **服務頁加序號**：Google AI Pro／Gemini Notebook／Vids（google-ai-pro）、Workspace Standard／Plus／T&L Upgrade／T&L Add-on（google-workspace）、ChromeOS Flex（chromeos-flex）
- 沒登記在兩次名單的 Edpuzzle、Kami、Photontree 不放編號
- 字型補「寶碁碩陽」，字型 v53、CSS v70、fonts.css v33

## v1.8.0（2026-10-05）

補強「研習詢問」的承接，針對課程詢問變少做的一輪調整。

- **文末詢問區塊加研習入口**：66 頁（知識庫、服務、科技觀察）的詢問區塊多一顆「看校園研習方案 →」，原本就有研習連結的 16 頁不動
- **`/contact?topic=` 預選詢問主題**：`training`＝校園研習、`aipro`＝AI Pro、`workspace`＝Workspace 授權；沒帶或代號不認得時維持原本預設。研習頁與新文章的按鈕改帶 `?topic=training`
- **新文章 `/knowledge/invite-ai-trainer`**：邀請 AI 研習講師前的七項資料、需求單欄位、影響報價的條件（研習費用不公開，文中不寫金額）、場地設備檢查與到校時程；接進知識庫、主題頁、sitemap、llms、搜尋索引與專屬 og 圖，並與研習頁、兩篇研習規劃文互相連結
- **`/services/campus-training` 標題與描述**改成「學校 AI 教師研習｜Google 認證講師到校」，貼近實際會被搜尋的字
- 字型子集補「趕」，字型 v51、CSS v68、fonts.css v32

## v1.7.2（2026-10-02）

內部工具「ChromeOS Flex 遠端部署」新增 Intune 大量部署手冊與 Intune 安裝腳本，並修正查核出的錯誤。

- **新頁 `/tools/flex-deploy-intune`**（noindex，與 flex-deploy 共用密碼，`functions/tools/_middleware.js` 加入路徑、
  `check-structure.py` 列為獨立版型）：以 4000 台 Surface Go 為例，盤點、退出 S 模式、Google 端準備、ONC 先測、
  Intune 每個欄位怎麼填、結束代碼對照、試點與分批、用序號對帳、失敗機處理與已知風險
- **工具包**：加入 `intune-install.ps1`（檢查、先模擬再正式、用結束代碼讓 Intune 後台看得出每台結果，記錄留在 ProgramData）
- **查核修正**（Google／Microsoft 官方原文逐字核對，另經 Gemini 與 ChatGPT 交叉審稿）：清 TPM 改成在 Windows 用 tpm.msc，
  BitLocker 開著時不可從韌體清（官方警告會讓 Windows 開不了機）；Intune 管理延伸模組不支援 S 模式；
  Intune 最慢每 8 小時檢查；安裝命令改用 Sysnative 路徑（直接寫 powershell.exe 會跑 32 位元）
- 字型子集補「叭喇喚眠睡闔」，字型 v48、CSS v67、fonts.css v31

## v1.7.1（2026-10-02）

內部工具「ChromeOS Flex 遠端部署」：一鍵轉換檔加入「只測試」模式，說明同步更新。

- **一鍵轉換檔新增 `$ONLY_TEST`**（預設 `$true`）：只跑檢查與模擬測試就停，不動硬碟；每種新機型第一台先這樣跑，確認後改 `$false` 才正式轉換。
  預設只測試，是為了忘記改設定時最壞只是多測一次，不會誤清客戶電腦
- **結果檔**：一鍵檔結束或任何一步停下時，把記錄打包成 `Flex結果-電腦名稱-時間.zip` 放桌面，對方只要傳一個檔案；
  不含 agent.toml、onc.json（裡面有權杖與 Wi-Fi 密碼）
- **`/tools/flex-deploy` 說明**：第 6 章加「只測試還是正式轉換」流程圖與建議（準備兩個檔案用檔名區分），記事本示意圖改成四行；
  第 8 章並列兩種模式的開頭畫面；第 9 章加「只測試到這裡結束」與「收到結果檔要看什麼」；第 10、14、20、23 章同步
- 工具包 zip 重新打包

## v1.7.0（2026-10-02）

新增 5 篇「學校導入 Google AI Pro for Education」決策路徑文章（與 ChatGPT 討論 5 輪定題、審稿）。

- **新文章**：`/knowledge/google-ai-pro-for-education`（是什麼）、`google-ai-pro-vs-workspace`（與 Workspace 版本差在哪，含 Standard）、
  `google-ai-pro-for-education-cost`（年約、月繳與折扣條件，不列單價）、`school-ai-procurement`（共同供應契約、詢價 10 問、資安與驗收）、
  `school-ai-training-plan`（內容、分場、追蹤，附 2026 實際場次）。每篇有問句小標、比較表、FAQPage、資料來源與查證日期框（Article 帶 citation）
- 事實只用 Google 官方頁面（2026-10-02 查證：AI Pro 須先有 Fundamentals／Standard／Plus、只能指派給 18 歲以上使用者、Plus 年約 50 到 999 授權 25% 折扣）與站上已公開的導入經驗
- **既有頁連進新文章**：AI Pro 服務頁、報價頁、Gemini 教育版、Workspace 版本比較、設備採購指南、研習規劃、校園研習服務。服務頁「學生可以用嗎」改成明確寫出 18 歲以上規則
- **知識庫列表**：ItemList 依列表實際 81 項重建（原本只列 48 項），篇數敘述全部統一為 81
- **修 `sync-dates.py`**：第一版會連 ItemList 裡各篇文章的 dateModified 一起改寫，v1.6.2 因此把科技觀察列表 8 篇日期改成同一天，已還原並排除 itemListElement

## v1.6.4（2026-10-02）

內部工具「ChromeOS Flex 遠端部署」說明改成圖解版，工具包加入一鍵轉換檔。

- **`/tools/flex-deploy` 圖解版**：改以「什麼都沒裝的電腦用一鍵轉換檔」為主軸，分五部 23 章；
  9 張工具介面實際截圖、5 張 Windows／Google 畫面示意圖（標明示意圖）、10 段一鍵檔實際印出的畫面文字，
  每一步附「你應該看到」與「沒看到的話」。依官方事件表更正：InstallSkipped 不代表成功，改看 InstallStarted
- **工具包 zip**：新增 `一鍵轉換Flex.bat`（對方雙擊、按是、輸入 Y 即自動下載 FRD、檢查、模擬、轉換）；
  不註冊時 Wi-Fi 免填（官方：onc_file 需要權杖才生效）；可用空間門檻依官方已知問題改 9GB
- 字型子集補「毀、筒」，字型 v46、CSS v66、fonts.css v30

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
