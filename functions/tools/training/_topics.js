/**
 * /tools/training 底下每篇講義各自的密碼（Steve 2026-09-17 定案：整個研習
 * 專區改成要密碼，不再對外公開；每篇各自一組＋共用講師萬用密碼）。
 *
 * 首頁本身（/tools/training）不算某一篇的教材，只認萬用密碼
 * （見 ../../go/_sessions.js 的 MASTER_PASSWORD，兩邊共用同一組，別重複維護）。
 * 每篇講義（/tools/training/<slug>）除了萬用密碼，也可以用這篇自己的密碼。
 *
 * 新增下一篇：檔案放進 tools/training/<slug>.html，在下面加一組密碼，
 * 同步在 tools/training.html 的主題清單補一個連結即可。
 * 沒列在這裡的 slug 預設也要密碼（只認萬用密碼），不會漏保護。
 */
export const TOPIC_PASSWORDS = {
  'vibe-coding': '348047',
};
