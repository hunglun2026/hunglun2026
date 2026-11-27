// 排程頁的純邏輯：文字對照、表單轉 API 內容、哪些按鈕能按。不碰畫面與網路，node 可直接測。
// 按鈕規則要和後端 worker/src/handlers.js 一致（後端才是最後把關，這裡只決定「畫面上顯示哪些」）。
import { parseEmails } from "./logic.js?v=20261123c";

export const STATUS_LABEL = {
  pending_approval: "待鴻綸核准", active: "排程中", paused: "已暫停", done: "已完成", overdue: "逾期未執行", needs_attention: "需要人處理",
};
export const RUN_LABEL = {
  ok: "完成", dry_run: "只預演（沒有寫入）", overdue: "逾期，沒有執行", needs_attention: "需要人處理", partial: "沒有全部完成",
  retry: "暫時失敗，之後會再試", test_ok: "手動測試通過", test_blocked: "手動測試沒過", running: "執行中",
};
export const TYPE_LABEL = { single: "單次轉移", monthly: "每月輪替" };

export const twToday = (now = Date.now()) => new Date(now + 8 * 3600e3).toISOString().slice(0, 10);

// form: {domain, sku, type, runDate, add, revoke, keep（文字）, months:[{month:"2026-12", list:文字}]}
export function buildBody(form) {
  const body = { domain: String(form.domain || "").trim().toLowerCase(), sku: form.sku, type: form.type, keep: parseEmails(form.keep), runTime: String(form.runTime || "").trim() || "03:00" };
  if (form.type === "single") { body.runDate = String(form.runDate || "").trim(); body.add = parseEmails(form.add); body.revoke = parseEmails(form.revoke); }
  else {
    body.months = {};
    for (const m of form.months || []) { const k = String(m.month || "").trim(); if (k) body.months[k] = parseEmails(m.list); }
  }
  return body;
}

// 下一次執行的說明（台灣時間；s.runTime 沒有的舊資料當作 03:00）
export function describeNext(s, today = twToday()) {
  if (["done", "overdue", "needs_attention"].includes(s.status)) return "";
  const dates = (s.runDates || []).filter((d) => d >= today);
  return dates.length ? `${dates[0]} ${s.runTime || "03:00"}（台灣時間）` : "沒有後續日期";
}
export function describeRun(r) {
  if (!r) return "還沒執行過";
  const c = r.counts ? `（指派 ${r.counts.add ?? 0}、收回 ${r.counts.remove ?? 0}）` : "";
  return `${r.runDate.startsWith("test:") ? "手動測試" : r.runDate}　${RUN_LABEL[r.status] || r.status}${c}`;
}

// 哪些按鈕能出現。me：{staff:boolean}；s：排程
export function allowedActions(me, s) {
  const staff = !!me.staff;
  const live = ["active", "pending_approval"].includes(s.status);
  return {
    approve: staff && s.status === "pending_approval",
    test: staff && ["active", "pending_approval", "paused", "needs_attention"].includes(s.status),
    toggleReal: staff && ["active", "paused", "needs_attention"].includes(s.status),
    pause: live,
    resume: s.status === "paused" || (staff && s.status === "needs_attention"),
    del: true,
  };
}

export const errorText = (e) => (e && e.message) || "發生未知錯誤";
