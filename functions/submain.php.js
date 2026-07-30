/**
 * 舊 PHP 官網 /submain.php?nav=..&tId=.. 的逐頁 301 轉址
 *
 * 為什麼需要這個檔案：
 * Cloudflare Pages 的 `_redirects` 不支援問號參數比對（官方文件明列 Query Parameters ❌），
 * 而舊站 24 筆網址裡有 22 筆都靠 nav／tId 參數區分頁面。若只用 _redirects，
 * 這 22 筆會全部塌成同一條規則，等於把所有舊頁面都導到同一頁——Google 會判定
 * 「轉址目標與原內容不相關」，舊頁面累積的排名權重轉移會大打折扣，甚至被當成軟性 404。
 * 因此改用 Pages Function 讀取 query string 做逐頁對應。
 *
 * 對應表來源：D:\ClaudeOnly\company\turn\轉址清單與教學.md（已逐頁確認過舊站實際內容）
 * 純路徑的舊網址（/index.php、/contact.php）不需要參數比對，寫在 _redirects 即可。
 */

// key 格式：`${nav}` 或 `${nav}:${tId}`
const MAP = {
  // ── 各分類總覽頁 ──
  "2": "/about",                          // 公司簡介
  "8": "/services/google-workspace",      // Google 教育 總覽
  "9": "/services/chromebook",            // Chromebook 總覽
  "3": "/services/digital-learning",      // 雲端數位學習 總覽
  "4": "/services/procurement",           // 台銀標專區 總覽
  "5": "/services/google-workspace",      // Google 認證培訓 總覽
  "7": "/events",                         // 活動剪影

  // ── Google 教育子頁 ──
  "8:42": "/knowledge/google",            // Google for Education
  "8:43": "/services/google-workspace",   // Google Workspace

  // ── Chromebook 子頁 ──
  "9:37": "/knowledge/chromebook",        // 瞭解 Chromebook
  "9:38": "/services/chromebook",         // Chromebook 產品列表

  // ── 雲端數位學習子頁 ──
  "3:31": "/knowledge/google",            // Google for Education
  "3:32": "/services/chromebook",         // Chromebook 行動學習載具
  "3:33": "/software",                    // 數位雲端教室輔助軟體（Edpuzzle／Kami／Padlet 等）
  "3:34": "/services/chromebook",         // 智慧情境教室
  "3:35": "/knowledge/chromebook",        // Cloudready Chrome OS

  // ── 台銀標子頁 ──
  // 註：原本這四筆指向 #computers／#peripherals／#systems，但頁面上並無這些錨點，
  // 等於轉址後停在頁首。改指向實際存在的區塊與各設備類別子頁。
  // 週邊標、伺服器＆儲存設備標、耗材標的品項目前缺貨、站上已無子頁，一律回總覽
  "4:10": "/services/procurement#categories",            // 電腦標
  "4:11": "/services/procurement",                       // 電腦週邊標
  "4:12": "/services/procurement",                       // 伺服器＆儲存設備標
  "4:13": "/services/procurement",                       // 耗材標

  // ── Google 認證培訓子頁 ──
  "5:24": "/services/google-workspace", // 認證課程明細（L1／L2／網域管理／訓練講師）
};

export function onRequest({ request }) {
  const url = new URL(request.url);
  const nav = url.searchParams.get("nav");
  const tId = url.searchParams.get("tId");

  // 先試最精確的 nav:tId，再退回只比對 nav，都沒有才回首頁
  const target =
    (nav && tId && MAP[`${nav}:${tId}`]) ||
    (nav && MAP[nav]) ||
    "/";

  return Response.redirect(new URL(target, url.origin).toString(), 301);
}
