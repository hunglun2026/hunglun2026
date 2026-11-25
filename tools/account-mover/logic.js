// OU 調度的純邏輯：不碰網路與畫面。測試：node --test tests/logic.test.mjs
// 讀名單、算預演、分批、做還原檔。解析 CSV 與信箱的函式跟 google-admin指派/web 的寫法一致，改一邊要看另一邊。

export const DEFAULT_MAX = 500; // 單次執行預設上限；畫面可調，但不超過 HARD_MAX
export const HARD_MAX = 3000;
export const BATCH_SIZE = 50; // 每批人數，每批做完回報一次

export const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export function cleanEmail(v) {
  let s = String(v ?? "").trim().toLowerCase();
  const m = s.match(/<([^>]+)>/); if (m) s = m[1].trim(); // 「王小明 <a@b.c>」
  return EMAIL_RE.test(s) ? s : "";
}

// 組織單位路徑一律長成 /學生/一年級；網域名稱或空白視為根目錄
export function normalizeOu(v, domain = "") {
  let s = String(v ?? "").trim().replace(/\\/g, "/").replace(/\s*\/\s*/g, "/");
  if (domain && s.toLowerCase() === domain.toLowerCase()) return "/";
  if (!s || s === "/") return "/";
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/\/+$/, "").replace(/\/{2,}/g, "/") || "/";
}

// Google 回的錯誤分類。頻率限制會回 403，要重試，不是沒權限
export function classify(status, message) {
  const m = (message || "").toLowerCase();
  if (/rate ?limit|too many requests|user rate/i.test(message || "") || status === 429) return "transient";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 401) return "auth";
  if (status >= 500) return "transient";
  if (m.includes("invalid ou") || m.includes("invalid orgunit") || m.includes("org unit")) return "bad_ou";
  return "other";
}

// ---- 讀來源 ----
export function parseCsv(text) {
  const s = String(text ?? "").replace(/^﻿/, "");
  const first = s.split(/\r?\n/, 1)[0] || "";
  const count = (ch) => first.split(ch).length - 1;
  const ranked = [["\t", count("\t")], [",", count(",")], [";", count(";")]].sort((a, b) => b[1] - a[1]);
  const delim = ranked[0][1] > 0 ? ranked[0][0] : ",";
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
export function decodeText(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { try { return new TextDecoder("big5").decode(bytes); } catch { return new TextDecoder("utf-8").decode(bytes); } }
}
export function sheetIdFromUrl(url) {
  const m = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || String(url || "").match(/^([a-zA-Z0-9_-]{30,})$/);
  const g = String(url || "").match(/[#&?]gid=(\d+)/);
  return m ? { id: m[1], gid: g ? g[1] : "" } : null;
}

// 二維陣列 -> 找信箱欄與目標組織單位欄。ouCol=-1 表示名單沒有這一欄，要用統一目標。
export function detectTable(rows2d) {
  const rows = (rows2d || []).map((r) => (r || []).map((c) => (c == null ? "" : String(c))));
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const emailCount = Array(ncols).fill(0);
  let firstData = -1;
  rows.forEach((r, ri) => r.forEach((c, ci) => { if (cleanEmail(c)) { emailCount[ci]++; if (firstData < 0) firstData = ri; } }));
  const best = Math.max(0, ...emailCount);
  if (best === 0) return { ok: false, headers: [], emailCol: -1, ouCol: -1, dataStart: 0, emailTotal: 0, rows };
  const mailHint = /e-?mail|信箱|帳號|電子郵件|mail/i;
  const tops = emailCount.map((n, i) => [n, i]).filter(([n]) => n === best).map(([, i]) => i);
  let emailCol = tops[0];
  if (tops.length > 1 && firstData > 0) { const hr = rows[firstData - 1] || []; const hit = tops.find((i) => mailHint.test(hr[i] || "")); if (hit !== undefined) emailCol = hit; }
  let headerRow = -1;
  for (let i = firstData - 1; i >= 0; i--) if (rows[i].some((c) => c.trim())) { headerRow = i; break; }
  const headers = Array.from({ length: ncols }, (_, i) => (headerRow >= 0 && rows[headerRow][i]?.trim()) || `第 ${i + 1} 欄`);
  const data = rows.slice(firstData);
  // 目標組織單位欄：標題像 OU，或欄內多數值以「/」開頭
  const ouHint = /org ?unit|組織單位|目標|OU|單位|班級|調到|移到/i;
  let ouCol = -1, bestScore = 0;
  for (let ci = 0; ci < ncols; ci++) {
    if (ci === emailCol) continue;
    const vals = data.map((r) => (r[ci] || "").trim()).filter(Boolean);
    if (!vals.length) continue;
    let score = vals.filter((v) => v.startsWith("/")).length / vals.length >= 0.6 ? 5 : 0;
    if (ouHint.test(headers[ci])) score += 3;
    if (score > bestScore) { bestScore = score; ouCol = ci; }
  }
  return { ok: true, headers, emailCol, ouCol, dataStart: firstData, emailTotal: best, rows };
}
export function rowsFromTable(t, { emailCol, ouCol = -1 }) {
  return t.rows.slice(t.dataStart).map((r) => ({ email: r[emailCol] ?? "", ou: ouCol >= 0 ? (r[ouCol] ?? "") : "" }))
    .filter((r) => String(r.email).trim() || String(r.ou).trim());
}
// 貼上的文字：每行「信箱」或「信箱 [分隔] 組織單位」
export function parsePasted(text) {
  return String(text ?? "").split(/\r?\n/).map((line) => {
    const parts = line.split(/[\t,;]/).map((x) => x.trim());
    const mi = parts.findIndex((p) => cleanEmail(p));
    if (mi < 0) return { email: line.trim(), ou: "" };
    const ou = parts.find((p, i) => i !== mi && p.startsWith("/")) ?? "";
    return { email: parts[mi], ou };
  }).filter((r) => r.email);
}

// ---- 預演 ----
// rows: [{email, ou}]；ctx: {users:Map(信箱 -> {ou, suspended}), ous:Set(路徑), domain, defaultOu}
// 回傳 [{op:'move'|'skip'|'error', email, from, to, reason}]
export function planMoves(rows, ctx) {
  const actions = [], seen = new Set();
  for (const r of rows) {
    const raw = String(r.email ?? "").trim();
    const email = cleanEmail(raw);
    if (!email) { actions.push({ op: "error", email: raw, reason: "電子郵件格式不對" }); continue; }
    if (seen.has(email)) { actions.push({ op: "error", email, reason: "名單裡重複出現" }); continue; }
    seen.add(email);
    const u = ctx.users.get(email);
    if (!u) { actions.push({ op: "error", email, reason: "目錄裡找不到這個使用者" }); continue; }
    const target = String(r.ou ?? "").trim() || ctx.defaultOu || "";
    if (!target) { actions.push({ op: "error", email, from: u.ou, reason: "沒有目標組織單位（名單沒填，也沒選統一目標）" }); continue; }
    const to = normalizeOu(target, ctx.domain);
    if (ctx.ous && !ctx.ous.has(to)) { actions.push({ op: "error", email, from: u.ou, to, reason: `組織單位「${to}」不存在` }); continue; }
    if (u.ou === to) { actions.push({ op: "skip", email, from: u.ou, to, reason: "已經在這個組織單位" }); continue; }
    actions.push({ op: "move", email, from: u.ou, to, reason: u.suspended ? "移動（此帳號已停權）" : "移動" });
  }
  return actions;
}
export function countOps(actions) { const c = { move: 0, skip: 0, error: 0 }; for (const a of actions) c[a.op]++; return c; }

// 預演後的檢查，回傳要擋下的原因（空陣列才能執行）
export function checkPlan(actions, max) {
  const c = countOps(actions), problems = [];
  if (c.error) problems.push(`有 ${c.error} 筆出錯，請回上一步修正名單`);
  if (c.move > max) problems.push(`要移動 ${c.move} 位，超過這次的上限 ${max}，請調高上限或把名單分成幾份`);
  return problems;
}
export function chunk(list, size = BATCH_SIZE) { const out = []; for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size)); return out; }

// 並行執行：最多 concurrency 個同時跑；shouldStop 為真就不再領新工作
export async function runPool(items, worker, { concurrency = 4, onResult = () => {}, shouldStop = () => false } = {}) {
  const results = new Array(items.length); let next = 0;
  async function lane() {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      try { await worker(items[i], i); results[i] = { ok: true }; }
      catch (e) { results[i] = { ok: false, kind: e.kind || "other", message: e.message }; }
      onResult(items[i], results[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}

// 分批執行。每批做完呼叫 onBatch；遇到「沒權限」「登入過期」這類致命錯誤就停手，不再打下一批。
// 回傳 {done:[{email,from,to}], failed:[{email,from,to,kind,message}], notRun:[...], stopped:字串或空}
export async function executeMoves(moves, api, { size = BATCH_SIZE, concurrency = 4, onBatch = () => {}, shouldStop = () => false } = {}) {
  const done = [], failed = []; let stopped = "";
  const batches = chunk(moves, size);
  for (let b = 0; b < batches.length; b++) {
    if (shouldStop()) { stopped = "已由你按下停止"; break; }
    const items = batches[b];
    const res = await runPool(items, (m) => api.moveUser(m.email, m.to), { concurrency, shouldStop: () => shouldStop() || !!stopped });
    let ok = 0, bad = 0;
    items.forEach((m, i) => {
      const r = res[i]; if (!r) return; // 被停手而沒跑到的
      if (r.ok) { done.push(m); ok++; } else {
        failed.push({ ...m, kind: r.kind, message: r.message }); bad++;
        if ((r.kind === "forbidden" || r.kind === "auth") && !stopped) stopped = r.kind === "auth" ? "登入已過期，請重新登入" : "這個帳號沒有調整使用者的權限";
      }
    });
    onBatch({ batch: b + 1, total: batches.length, ok, bad, done: done.length, failed: failed.length });
    if (stopped) break;
  }
  const handled = new Set([...done, ...failed].map((m) => m.email));
  return { done, failed, notRun: moves.filter((m) => !handled.has(m.email)), stopped };
}

// 還原檔：把成功移動的人調回原本的組織單位。格式與一般名單相同（信箱＋目標組織單位），
// 所以直接拿回步驟 2 上傳就能還原，不需要另一套流程。
export function buildUndoRows(done) { return done.map((m) => [m.email, m.from]); }

// 執行後比對：重新讀目錄，成功移動的人應該都在新的組織單位
export function verifyMoves(done, usersNow) {
  const problems = [];
  for (const m of done) {
    const u = usersNow.get(m.email);
    if (!u) problems.push(`${m.email}：目錄裡讀不到`);
    else if (u.ou !== m.to) problems.push(`${m.email}：目前在 ${u.ou}，應該在 ${m.to}`);
  }
  return problems;
}
