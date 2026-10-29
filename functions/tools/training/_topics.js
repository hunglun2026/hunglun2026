/**
 * /tools/training 底下每篇講義的代號（Steve 2026-09-17 定案：整個研習專區要密碼；每篇各自一組＋共用講師總密碼）。
 *
 * 密碼不放這裡（2026-10-29 健檢發現原本寫在公開 repo，已全部換新）：
 * - 各篇講義密碼 → Cloudflare Pages 加密變數 GO_TOPIC_PASSWORDS_JSON（{"<slug>": "6 位數字"}）
 * - 講師總密碼   → GO_MASTER_PASSWORD（跟 /go 短連結共用）
 * 來源是 sitemap/go_sessions.private.json 的 topic_passwords，改完跑 python sitemap/go-sessions-push.py。
 * 沒列密碼的篇預設也要密碼（只認總密碼），不會漏保護。
 */
export const TOPIC_SLUGS = ["vibe-coding"];
