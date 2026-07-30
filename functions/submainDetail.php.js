/**
 * 舊 PHP 官網 /submainDetail.php?nav=..&tId=..&sId=.. 的逐頁 301 轉址
 *
 * 舊站 hunglun.com 即將關閉，網域會轉指到新站。舊網址累積十餘年的
 * 搜尋排名要靠逐頁 301 轉移，若統統導到同一頁（或不相關的頁面），
 * Google 會判定為軟性 404，權重轉移大打折扣。
 *
 * 對應表來源：2026-07-30 實際爬取舊站首頁與各 nav 總覽頁，
 * 取得 63 個細項頁的 sId 與標題後逐一對應（sId 全站唯一，故只比對 sId）。
 */

// key：sId
const MAP = {
  // ── nav=3 雲端數位學習 ──
  "17": "/services/campus-training",   // 國際講師培訓中心
  "20": "/services/google-workspace",  // Google 雲端教育服務
  "22": "/software#thinglink",         // Thinglink VR360 編輯平台
  "23": "/services/chromebook",        // Chromebook 行動學習載具
  "24": "/knowledge/chromebook",       // Chrome Education Upgrade
  "25": "/software#photontree",        // Photontree
  "26": "/services/chromebook",        // 智慧情境教室
  "66": "/",                           // 舊站的「找不到網頁」頁
  "72": "/knowledge/privacy",          // 隱私權政策
  "78": "/software#mobile-guardian",   // Mobile Guardian
  "80": "/software#edpuzzle",          // Edpuzzle 互動式影片學習
  "81": "/services/chromebook",        // ASUS Chromebook Detachable CM3000
  "82": "/services/chromebook",        // ASUS Chromebook Detachable CZ1
  "89": "/services/chromebook",        // ASUS Chromebook C214
  "90": "/services/chromebook",        // ASUS Chromebook C202XA
  "99": "/software#kami",              // Kami 數位課程互動編輯平臺
  "100": "/software#adobe",            // Adobe
  "101": "/services/google-ai-pro",    // Google AI Pro for Education
  "104": "/software#padlet",           // Padlet
  "105": "/software#wordwall",         // Wordwall
  "106": "/software#kahoot",           // Kahoot!

  // ── nav=4 台銀標專區 ──
  // 缺貨而站上已無子頁者（9 筆電／10 儲存／11 精簡型／38 耗材／
  // 39 週邊／40 伺服器／83 超融合）不列，交由下方 NAV 預設導向總覽頁
  "7": "/services/procurement/desktop",  // 個人電腦之主機
  "8": "/services/procurement/monitor",  // 個人電腦之顯示器
  "12": "/services/procurement/gpu",     // 顯示卡
  "13": "/services/procurement/tablet",  // 平板電腦
  "14": "/services/procurement/camera",  // 彩色數位相機及攝影機

  // ── nav=5 Google 認證培訓 ──
  "85": "/services/campus-training",   // Google 認證教育家 Level 1
  "86": "/services/campus-training",   // Google 認證教育家 Level 2
  "87": "/services/campus-training",   // Google 網域管理培訓
  "88": "/services/campus-training",   // Google 認證訓練講師

  // ── nav=8 Google 教育 ──
  "93": "/knowledge/google",           // Google for Education
  "94": "/services/google-workspace",  // Google Workspace

  // ── nav=9 Chromebook ──
  "92": "/knowledge/chromebook",       // 瞭解 Chromebook
  "95": "/services/chromebook",        // ASUS Chromebook C214
  "97": "/services/chromebook",        // ASUS Chromebook Flip CX3
  "103": "/services/chromebook",       // ASUS BR1102FGA
  "107": "/services/chromebook",       // ASUS Chromebook CM32 Detachable
};

// sId 對不到時，至少依 nav 導到同一個主題的區塊，不要塌到首頁
const NAV = {
  "2": "/about",                  // 公司簡介
  "3": "/software",               // 雲端數位學習
  "4": "/services/procurement",   // 台銀標專區
  "5": "/services/campus-training", // Google 認證培訓
  "7": "/events",                 // 活動剪影
  "8": "/google",                 // Google 教育
  "9": "/services/chromebook",    // Chromebook
};

export function onRequest({ request }) {
  const url = new URL(request.url);
  const sId = url.searchParams.get("sId");
  const nav = url.searchParams.get("nav");

  const target = (sId && MAP[sId]) || (nav && NAV[nav]) || "/";

  return Response.redirect(new URL(target, url.origin).toString(), 301);
}
