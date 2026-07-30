/**
 * 舊 PHP 官網 /submainDetail.php?nav=4&tId=..&sId=.. 的逐頁 301 轉址
 *
 * 舊站台銀標專區的 12 個設備細項頁，各自對應到新站
 * /services/procurement/<類別> 子頁。舊站伺服器將關閉，
 * 這些網址累積的權重要接住，不能讓它們變成 404。
 *
 * 對應以 sId 為準（tId 只是上層分類，不影響目標頁）。
 * 舊站沒有「投影機」與「電腦軟體」細項頁，故此表僅 12 筆。
 */

// key：sId
const MAP = {
  "7": "/services/procurement/desktop",     // 個人電腦之主機
  "8": "/services/procurement/monitor",     // 個人電腦之顯示器
  "9": "/services/procurement/laptop",      // 筆記型電腦
  "10": "/services/procurement/storage",    // 儲存系統設備
  "11": "/services/procurement/thin",       // 精簡型電腦
  "12": "/services/procurement/gpu",        // 顯示卡
  "13": "/services/procurement/tablet",     // 平板電腦
  "14": "/services/procurement/camera",     // 彩色數位相機及攝影機
  "38": "/services/procurement/consumable", // 印表機耗材
  "39": "/services/procurement/peripheral", // 電腦週邊設備用品
  "40": "/services/procurement/server",     // 伺服器
  "83": "/services/procurement/hci",        // 超融合系統設備
};

export function onRequest({ request }) {
  const url = new URL(request.url);
  const sId = url.searchParams.get("sId");

  // 對不到的細項頁退回台銀標總覽，不要塌到首頁
  const target = (sId && MAP[sId]) || "/services/procurement";

  return Response.redirect(new URL(target, url.origin).toString(), 301);
}
