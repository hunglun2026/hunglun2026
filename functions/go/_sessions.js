/**
 * 研習現場短連結（/go/<代碼>）的場次清單：只放代碼與標題，公開沒關係。
 *
 * 密碼與講義網址不放這裡（2026-10-29 健檢發現原本寫在公開 repo，任何人都讀得到，已全部換新）：
 * - 每場口令、講義網址 → Cloudflare Pages 加密變數 GO_SESSIONS_JSON
 * - 講師總密碼       → Cloudflare Pages 加密變數 GO_MASTER_PASSWORD
 * 兩者的來源是 sitemap/go_sessions.private.json（sitemap/ 不進公開 repo），改完跑 python sitemap/go-sessions-push.py。
 *
 * 新增下一場：私有檔加一組 → 這裡加代碼與標題 → tools/training.html 補連結 → 推送變數 → 推官網。
 */
export const GO_LABELS = {
  '1020': '長榮大學 AI 研習',
  '1015': '國立北港高級中學 AI 研習',
  '1013': '國立臺南高級商業職業學校 AI 研習',
  '1012': '南光高級中學 AI 研習',
  '0930': '吳鳳科技大學 AI 研習',
  '0916': '吳鳳科技大學 AI 研習：用白話文寫程式（Vibe Coding）',
};
