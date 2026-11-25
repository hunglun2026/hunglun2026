// 授權輪替的純邏輯：不碰網路、不碰畫面，瀏覽器與 node 都能跑。
// 規則與 Python 版 gadmin_license/rotate.py、plan.py 一致（改一邊要同步改另一邊，tests/logic.test.mjs 逐項比對）。

export const SKUS = {
  "ai-pro": { product: "101047", sku: "1010470004", name: "Google AI Pro for Education" },
  "teaching-learning": { product: "101037", sku: "1010370001", name: "Teaching and Learning Upgrade" },
  "plus": { product: "101031", sku: "1010310008", name: "Education Plus" },
  "plus-staff": { product: "101031", sku: "1010310009", name: "Education Plus (Staff)" },
};
// Fundamentals、Gmail Only、封存使用者 SKU 受保護，網頁不提供也不接受

export const DEFAULT_MAX = 500; // 單次執行預設上限；預演畫面可調高，但不超過 HARD_MAX（2026-11-25 Steve 要測極限，原本固定 30）
export const HARD_MAX = 3000;
export const QUOTA_RETRY_WAITS = [5, 10, 20, 40, 60]; // 剛收回的位子要幾秒才釋出（2026-11-22 實測）

export function parseEmails(text) {
  const seen = new Set();
  for (const part of String(text || "").split(/[\s,;，；]+/)) {
    const e = part.trim().toLowerCase();
    if (e.includes("@")) seen.add(e);
  }
  return [...seen];
}

export function classify(status, message) {
  const m = (message || "").toLowerCase();
  if (/rate ?limit|too many requests|user rate/i.test(message || "") || status === 429) return "transient"; // Directory API 超過頻率限制會回 403 rateLimitExceeded，要重試不是沒權限
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409 || m.includes("already")) return "already";
  if (m.includes("mutually exclusive") || m.includes("conflict")) return "conflict";
  if (["not enough", "enough available", "aren't enough", "insufficient", "quota", "exceed", "no available", "no licenses"]
    .some((w) => m.includes(w))) return "quota";
  if (status === 429 || status >= 500) return "transient";
  return "other";
}

// users: [{email, suspended, archived}]；holders: Set(信箱)；回傳 {actions:[{op,email,reason}], warnings:[]}
// op：remove／add／skip／error。先收回、再指派。
export function planRotation({ add, revoke, keep = [], users, holders }) {
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const protectedSet = new Set(keep.map((e) => e.toLowerCase()));
  const warnings = [];
  const addSet = new Set(add);
  const actions = [];

  const both = revoke.filter((e) => addSet.has(e));
  for (const e of both) warnings.push(`${e} 同時出現在「要收回」與「要指派」，請修正名單`);

  const judge = (email, mode) => {
    const u = byEmail.get(email);
    if (protectedSet.has(email)) return { op: "skip", email, reason: "在保留名單，不異動" };
    if (!u) return { op: "error", email, reason: "目錄裡找不到這個使用者" };
    if (u.archived) return { op: "skip", email, reason: "封存使用者，不能指派一般授權" };
    if (u.suspended) return { op: "skip", email, reason: "已停權" };
    if (mode === "remove") return holders.has(email) ? { op: "remove", email, reason: "目前有此授權" } : null; // 本來就沒有：不列，免得洗版
    return holders.has(email) ? { op: "skip", email, reason: "已有此授權" } : { op: "add", email, reason: "沒有此授權" };
  };

  for (const e of revoke) { if (!addSet.has(e)) { const a = judge(e, "remove"); if (a) actions.push(a); } }
  for (const e of add) { if (!both.includes(e)) actions.push(judge(e, "add")); }
  return { actions, warnings, conflicts: both };
}

export function counts(actions) {
  const c = { add: 0, remove: 0, skip: 0, error: 0 };
  for (const a of actions) c[a.op]++;
  return c;
}

// available：後台訂閱頁的可用數（沒填就是 null）。收回的位子可重用。回傳空字串＝沒問題。
export function checkAvailable(actions, available) {
  if (available === null || available === undefined || available === "") return "";
  const c = counts(actions);
  const n = Number(available);
  if (c.add > n + c.remove) return `可用授權只有 ${n}，收回 ${c.remove} 位後仍不夠指派 ${c.add} 位（缺 ${c.add - n - c.remove}）`;
  return "";
}

// 只檢查「這次真的動過的人」：指派的要有、收回的不能有。被跳過的人（停權、保留名單、本來就沒有）不算。
export function verifyAfter(actions, holdersNow) {
  const problems = [];
  for (const a of actions) {
    if (a.op === "add" && !holdersNow.has(a.email)) problems.push(`${a.email} 應該有授權但沒有`);
    if (a.op === "remove" && holdersNow.has(a.email)) problems.push(`${a.email} 應該被收回但還有授權`);
  }
  return problems;
}

// 執行：api = {addLicense(email), removeLicense(email)}；回傳 {ok, failed, stopped, rows}
export async function execute(actions, api, { maxChanges = DEFAULT_MAX, sleep = (s) => new Promise((r) => setTimeout(r, s * 1000)), onRow = () => {}, onWait = () => {} } = {}) {
  const todo = actions.filter((a) => a.op === "add" || a.op === "remove");
  if (todo.length > maxChanges) throw new Error(`要異動 ${todo.length} 位，超過上限 ${maxChanges}，已中止`);
  const result = { ok: 0, failed: 0, already: 0, stopped: "", rows: [] };
  let removedAny = false;
  for (const a of todo) {
    const row = { time: new Date().toLocaleTimeString("zh-TW", { hour12: false }), email: a.email, op: a.op };
    const waits = a.op === "add" && removedAny ? [...QUOTA_RETRY_WAITS] : [];
    for (;;) {
      try {
        await (a.op === "add" ? api.addLicense(a.email) : api.removeLicense(a.email));
        row.result = "ok"; result.ok++; removedAny = removedAny || a.op === "remove";
        break;
      } catch (e) {
        if (a.op === "add" && e.kind === "already") { // 後台已是目標狀態（列表還沒追上時常見）：算成功，不算失敗
          row.result = "ok"; row.note = "已有授權"; result.ok++; result.already++;
          break;
        }
        if (e.kind === "quota" && waits.length) {
          const w = waits.shift(); onWait(a.email, w); await sleep(w); continue;
        }
        row.result = "fail"; row.kind = e.kind; row.message = e.message; result.failed++;
        if (e.kind === "forbidden" || e.kind === "quota") result.stopped = `${e.kind}：${e.message}`;
        break;
      }
    }
    result.rows.push(row); onRow(row);
    if (result.stopped) break;
  }
  return result;
}

// ================= 名單表格與匯入辨識（純邏輯） =================
export const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const ACTION_LABEL = { add: "指派", revoke: "收回", keep: "保留不動" };

const ADD_WORDS = ["指派", "新增", "增加", "啟用", "開通", "授權", "給", "add", "assign", "enable", "grant", "v", "✓", "✔"];
const REVOKE_WORDS = ["收回", "移除", "撤銷", "取消", "拔除", "刪除", "停用", "remove", "revoke", "delete", "unassign"];
const KEEP_WORDS = ["保留", "不動", "不變", "例外", "跳過", "keep", "skip", "protect", "protected"];

// 把格子裡的文字轉成動作；看不懂就回 null（例如後台匯出檔的 Status 欄 ACTIVE/SUSPENDED）
export function normalizeAction(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (ADD_WORDS.includes(v)) return "add";
  if (REVOKE_WORDS.includes(v)) return "revoke";
  if (KEEP_WORDS.includes(v)) return "keep";
  return null;
}

export function isEmail(value) { return EMAIL_RE.test(String(value ?? "").trim()); }

// 從「Name <a@b.com>」或「a@b.com」取出信箱，不是信箱就回 ""
export function cleanEmail(value) {
  const s = String(value ?? "").trim();
  const m = s.match(/<([^<>\s]+@[^<>\s]+)>/);
  const e = (m ? m[1] : s).toLowerCase();
  return EMAIL_RE.test(e) ? e : "";
}

// CSV／TSV 解析：支援引號、逗號內換行、BOM，分隔符號自動判斷（逗號、tab、分號）
export function parseCsv(text) {
  let s = String(text ?? "").replace(/^﻿/, "");
  const first = s.split(/\r?\n/, 1)[0] || "";
  const count = (ch) => first.split(ch).length - 1;
  const delim = [["\t", count("\t")], [",", count(",")], [";", count(";")]].sort((a, b) => b[1] - a[1])[0][1] > 0
    ? [["\t", count("\t")], [",", count(",")], [";", count(";")]].sort((a, b) => b[1] - a[1])[0][0] : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}

// 自動辨識：哪一欄是信箱、哪一欄是動作、標題列在哪。rows2d 是二維陣列（CSV、Excel、試算表都先轉成它）。
export function detectTable(rows2d) {
  const rows = (rows2d || []).map((r) => (r || []).map((c) => (c == null ? "" : String(c))));
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const emailCount = Array(ncols).fill(0);
  let firstDataRow = -1;
  rows.forEach((r, ri) => r.forEach((c, ci) => { if (cleanEmail(c)) { emailCount[ci]++; if (firstDataRow < 0) firstDataRow = ri; } }));
  const best = Math.max(0, ...emailCount);
  if (best === 0) return { ok: false, headers: [], emailCol: -1, actionCol: -1, headerRow: -1, dataStart: 0, emailTotal: 0, rows };
  const headerHint = /e-?mail|信箱|帳號|電子郵件|mail/i;
  let emailCol = emailCount.indexOf(best);
  // 數量相同時，標題像信箱的優先
  const topCols = emailCount.map((n, i) => [n, i]).filter(([n]) => n === best).map(([, i]) => i);
  if (topCols.length > 1 && firstDataRow > 0) {
    const hr = rows[firstDataRow - 1] || [];
    const hit = topCols.find((i) => headerHint.test(hr[i] || ""));
    if (hit !== undefined) emailCol = hit;
  }
  // 標題列：第一筆資料列之前最近的非空列（沒有就是無標題）
  let headerRow = -1;
  for (let i = firstDataRow - 1; i >= 0; i--) { if (rows[i].some((c) => c.trim())) { headerRow = i; break; } }
  const dataStart = firstDataRow;
  const headers = Array.from({ length: ncols }, (_, i) => (headerRow >= 0 && rows[headerRow][i]?.trim()) || `第 ${i + 1} 欄`);
  const data = rows.slice(dataStart);
  const actionHint = /動作|操作|action|處理|異動|指派|授權動作/i;
  let actionCol = -1, bestScore = 0;
  for (let ci = 0; ci < ncols; ci++) {
    if (ci === emailCol) continue;
    const vals = data.map((r) => (r[ci] || "").trim()).filter(Boolean);
    if (!vals.length) continue;
    const recognized = vals.filter((v) => normalizeAction(v)).length / vals.length;
    let score = recognized >= 0.6 ? 5 : 0;
    if (score && actionHint.test(headers[ci])) score += 3;
    if (score > bestScore) { bestScore = score; actionCol = ci; }
  }
  return { ok: true, headers, emailCol, actionCol, headerRow, dataStart, emailTotal: best, rows };
}

// 依使用者確認的欄位，把表格轉成 [{email, action}]。沒有動作欄、或該格看不懂時，用 defaultAction。
export function rowsFromTable(table, { emailCol, actionCol = -1, defaultAction = "add" }) {
  const out = [], seen = new Map(); let skipped = 0, dups = 0, unknownAction = 0;
  for (const r of table.rows.slice(table.dataStart)) {
    const email = cleanEmail(r[emailCol]);
    if (!email) { if ((r[emailCol] || "").trim()) skipped++; continue; }
    let action = defaultAction;
    if (actionCol >= 0 && (r[actionCol] || "").trim()) {
      const a = normalizeAction(r[actionCol]);
      if (a) action = a; else unknownAction++;
    }
    if (seen.has(email)) { dups++; out[seen.get(email)].action = action; continue; }
    seen.set(email, out.length); out.push({ email, action });
  }
  return { rows: out, skipped, dups, unknownAction };
}

// 貼上的文字（一行一筆，信箱與動作可用 tab 或逗號隔開）轉成列
export function parsePasted(text, defaultAction = "add") {
  const lines = String(text ?? "").split(/\r?\n/).filter((l) => l.trim());
  const out = [], seen = new Set();
  for (const line of lines) {
    const cells = line.split(/[\s,;，；]+/).filter((x) => x !== "");
    let email = "", action = defaultAction;
    for (const c of cells) { const e = cleanEmail(c); if (e && !email) email = e; else { const a = normalizeAction(c); if (a) action = a; } }
    if (email && !seen.has(email)) { seen.add(email); out.push({ email, action }); }
  }
  return out;
}

// 表格列 -> 三份名單；回傳 {add, revoke, keep, invalid}。同一信箱重複出現時，後面的列蓋掉前面的。
export function listsFromRows(rows) {
  const final = new Map(); let invalid = 0;
  for (const r of rows) {
    const raw = String(r.email ?? "").trim();
    if (!raw) continue;
    const e = cleanEmail(raw);
    if (!e) { invalid++; continue; }
    final.set(e, r.action);
  }
  const lists = { add: [], revoke: [], keep: [], invalid };
  for (const [e, a] of final) lists[a === "revoke" ? "revoke" : a === "keep" ? "keep" : "add"].push(e);
  return lists;
}

// 位元組轉文字：先試 UTF-8，失敗就用 Big5（台灣 Excel 另存的 CSV 常是 Big5）
export function decodeText(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { try { return new TextDecoder("big5").decode(bytes); } catch { return new TextDecoder("utf-8").decode(bytes); } }
}

export function sheetIdFromUrl(url) {
  const m = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || String(url || "").match(/^([a-zA-Z0-9_-]{30,})$/);
  const g = String(url || "").match(/[#&?]gid=(\d+)/);
  return m ? { id: m[1], gid: g ? g[1] : "" } : null;
}
