// Chromebook 轉移的純邏輯：不碰網路與畫面。測試：node --test tests/logic.test.mjs
// 以序號識別裝置；預演只要有一台有問題就整批不執行（Steve 2026-11-25 決定）。
// 讀 CSV、組織單位、錯誤分類的函式抄自 ../帳號轉移/web/logic.js，改一邊要看另一邊。

export const DEFAULT_MAX = 500; // 單次執行預設上限；畫面可調，但不超過 HARD_MAX
export const HARD_MAX = 3000;
export const BATCH_SIZE = 50; // moveDevicesToOu 單次最多 50 台（官方文件）
export const BLOCKED_STATUS = { DISABLED: "裝置已被停用", DEPROVISIONED: "裝置已取消佈建" };

// 序號：只留英數字並轉大寫（容許貼上時夾空白、橫線、引號、零寬字元）
export function cleanSerial(v) {
  if (/[:：]/.test(String(v ?? ""))) return ""; // 含冒號的是時間，不是序號
  const s = String(v ?? "").replace(/[\s​-‍﻿"'`\-_.]/g, "").toUpperCase();
  return /^[A-Z0-9]{5,30}$/.test(s) ? s : "";
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

// 二維陣列 -> 找序號欄與目標組織單位欄。ouCol=-1 表示名單沒有這一欄，要用統一目標。
// 若表頭同時有「原本…」與「搬到…」兩個組織單位欄，視為本工具產生的搬移紀錄：ouCol 指向「原本」欄，
// 並標 isRecord，這樣整份紀錄丟回來就是還原。
export function detectTable(rows2d) {
  const rows = (rows2d || []).map((r) => (r || []).map((c) => (c == null ? "" : String(c))));
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  // 表頭：前 5 列裡第一個有「序號／serial／SN」字樣的列。英文表頭（Serial）清理後也長得像序號，所以要先認出來排除。
  const hint = /序號|serial|s\/n|^sn$/i;
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) if (rows[i].some((c) => hint.test(c.trim()))) { headerRow = i; break; }
  const serialCount = Array(ncols).fill(0);
  let firstData = -1;
  rows.forEach((r, ri) => { if (ri <= headerRow) return; r.forEach((c, ci) => { if (cleanSerial(c) && !c.trim().startsWith("/")) { serialCount[ci]++; if (firstData < 0) firstData = ri; } }); });
  const best = Math.max(0, ...serialCount);
  if (best === 0) return { ok: false, headers: [], serialCol: -1, ouCol: -1, dataStart: 0, total: 0, rows, isRecord: false };
  const tops = serialCount.map((n, i) => [n, i]).filter(([n]) => n === best).map(([, i]) => i);
  if (headerRow < 0) for (let i = firstData - 1; i >= 0; i--) if (rows[i].some((c) => c.trim())) { headerRow = i; break; }
  const headersRaw = headerRow >= 0 ? rows[headerRow] : [];
  let serialCol = tops[0];
  const hit = tops.find((i) => hint.test(headersRaw[i] || ""));
  if (hit !== undefined) serialCol = hit;
  const dataStart = firstData;
  const headers = Array.from({ length: ncols }, (_, i) => (headersRaw[i] || "").trim() || `第 ${i + 1} 欄`);
  const data = rows.slice(dataStart);
  const fromCol = headers.findIndex((h) => /原本|原組織|原單位|from/i.test(h));
  const toCol = headers.findIndex((h) => /搬到|移到|調到/i.test(h));
  if (fromCol >= 0 && toCol >= 0 && fromCol !== serialCol) return { ok: true, headers, serialCol, ouCol: fromCol, dataStart, total: best, rows, isRecord: true };
  const ouHint = /org ?unit|組織單位|目標|OU|單位|班級|調到|移到/i;
  let ouCol = -1, bestScore = 0;
  for (let ci = 0; ci < ncols; ci++) {
    if (ci === serialCol) continue;
    const vals = data.map((r) => (r[ci] || "").trim()).filter(Boolean);
    if (!vals.length) continue;
    let score = vals.filter((v) => v.startsWith("/")).length / vals.length >= 0.6 ? 5 : 0;
    if (ouHint.test(headers[ci])) score += 3;
    if (score > bestScore) { bestScore = score; ouCol = ci; }
  }
  return { ok: true, headers, serialCol, ouCol, dataStart, total: best, rows, isRecord: false };
}
export function rowsFromTable(t, { serialCol, ouCol = -1 }) {
  return t.rows.slice(t.dataStart).map((r) => ({ serial: r[serialCol] ?? "", ou: ouCol >= 0 ? (r[ouCol] ?? "") : "" }))
    .filter((r) => String(r.serial).trim() || String(r.ou).trim());
}
// 貼上的文字：每行「序號」或「序號 [分隔] 組織單位」
export function parsePasted(text) {
  return String(text ?? "").split(/\r?\n/).map((line) => {
    const parts = line.split(/[\t,;]/).map((x) => x.trim());
    const si = parts.findIndex((p) => !p.startsWith("/") && cleanSerial(p));
    if (si < 0) return { serial: line.trim(), ou: "" };
    const ou = parts.find((p, i) => i !== si && p.startsWith("/")) ?? "";
    return { serial: parts[si], ou };
  }).filter((r) => r.serial);
}

// ---- 預演 ----
// rows: [{serial, ou}]；ctx: {devices:Map(序號 -> {id, ou, status, model, dup}), ous:Set(路徑), domain, defaultOu}
// 回傳 [{op:'move'|'error', serial, id, from, to, reason}]。「已在目標」「停用」「取消佈建」「找不到」「重複」全算 error。
export function planMoves(rows, ctx) {
  const actions = [], seen = new Set();
  for (const r of rows) {
    const raw = String(r.serial ?? "").trim();
    const serial = cleanSerial(raw);
    if (!serial) { actions.push({ op: "error", serial: raw, reason: "序號格式不對（應為 5 到 30 個英數字）" }); continue; }
    if (seen.has(serial)) { actions.push({ op: "error", serial, reason: "名單裡重複出現" }); continue; }
    seen.add(serial);
    const d = ctx.devices.get(serial);
    if (!d) { actions.push({ op: "error", serial, reason: "目錄裡找不到這個序號（打錯，或不是這個網域的裝置）" }); continue; }
    if (d.dup) { actions.push({ op: "error", serial, from: d.ou, reason: "目錄裡有多台裝置用同一個序號，無法判斷是哪一台" }); continue; }
    const target = String(r.ou ?? "").trim() || ctx.defaultOu || "";
    if (!target) { actions.push({ op: "error", serial, id: d.id, from: d.ou, reason: "沒有目標組織單位（名單沒填，也沒選統一目標）" }); continue; }
    const to = normalizeOu(target, ctx.domain);
    if (ctx.ous && !ctx.ous.has(to)) { actions.push({ op: "error", serial, id: d.id, from: d.ou, to, reason: `組織單位「${to}」不存在` }); continue; }
    if (BLOCKED_STATUS[d.status]) { actions.push({ op: "error", serial, id: d.id, from: d.ou, to, reason: BLOCKED_STATUS[d.status] }); continue; }
    if (d.ou === to) { actions.push({ op: "error", serial, id: d.id, from: d.ou, to, reason: "已經在這個組織單位" }); continue; }
    const note = d.status && d.status !== "ACTIVE" ? `移動（裝置狀態 ${d.status}）` : "移動";
    actions.push({ op: "move", serial, id: d.id, from: d.ou, to, reason: note });
  }
  return actions;
}
export function countOps(actions) { const c = { move: 0, error: 0 }; for (const a of actions) c[a.op]++; return c; }

// 預演後的檢查，回傳要擋下的原因（空陣列才能執行）。有任何一台有問題就整批擋下。
export function checkPlan(actions, max) {
  const c = countOps(actions), problems = [];
  if (c.error) problems.push(`有 ${c.error} 台有問題，整批不會執行；請回上一步修正名單（可下載問題清單）`);
  if (c.move > max) problems.push(`要搬 ${c.move} 台，超過這次的上限 ${max}，請調高上限或把名單分成幾份`);
  return problems;
}
export function chunk(list, size = BATCH_SIZE) { const out = []; for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size)); return out; }

// 同一個目標組織單位的裝置才能放同一次呼叫，所以先依目標分組，每組再切成每 50 台一批
export function makeBatches(moves, size = BATCH_SIZE) {
  const byOu = new Map();
  for (const m of moves) { if (!byOu.has(m.to)) byOu.set(m.to, []); byOu.get(m.to).push(m); }
  return [...byOu].flatMap(([to, list]) => chunk(list, size).map((items) => ({ to, items })));
}

// 分批執行（依序，不平行，避免頻率限制）。每批做完呼叫 onBatch；遇到「沒權限」「登入過期」就停手。
// 一次呼叫失敗時，無法確認這批有沒有部分成功（官方文件沒寫），所以整批標失敗，並由執行後驗證補抓實際狀態。
export async function executeMoves(moves, api, { size = BATCH_SIZE, onBatch = () => {}, shouldStop = () => false } = {}) {
  const done = [], failed = []; let stopped = "";
  const batches = makeBatches(moves, size);
  for (let b = 0; b < batches.length; b++) {
    if (shouldStop()) { stopped = "已由你按下停止"; break; }
    const { to, items } = batches[b];
    try { await api.moveDevices(items.map((m) => m.id), to); done.push(...items); onBatch({ batch: b + 1, total: batches.length, ok: items.length, bad: 0, done: done.length, failed: failed.length }); }
    catch (e) {
      failed.push(...items.map((m) => ({ ...m, kind: e.kind || "other", message: e.message })));
      if (e.kind === "forbidden" || e.kind === "auth") stopped = e.kind === "auth" ? "登入已過期，請重新登入" : "這個帳號沒有管理 Chromebook 的權限";
      onBatch({ batch: b + 1, total: batches.length, ok: 0, bad: items.length, done: done.length, failed: failed.length });
      if (stopped) break;
    }
  }
  const handled = new Set([...done, ...failed].map((m) => m.serial));
  return { done, failed, notRun: moves.filter((m) => !handled.has(m.serial)), stopped };
}

// 搬移紀錄：序號、原本組織單位、搬到組織單位、時間。整份上傳回工具會被辨認成紀錄，自動搬回「原本」。
export const RECORD_HEADERS = ["序號", "原本組織單位", "搬到組織單位", "時間"];
export function buildRecordRows(done, time) { return done.map((m) => [m.serial, m.from, m.to, time]); }

// 執行後比對：重新讀目錄，成功搬移的裝置應該都在新的組織單位。
// 失敗那批若其實已經搬成功（官方文件沒寫部分成功的行為），一併回報，讓使用者知道真實狀況。
export function verifyMoves(done, devicesNow, failed = []) {
  const problems = [];
  for (const m of done) {
    const d = devicesNow.get(m.serial);
    if (!d) problems.push(`${m.serial}：目錄裡讀不到`);
    else if (d.ou !== m.to) problems.push(`${m.serial}：目前在 ${d.ou}，應該在 ${m.to}`);
  }
  const actuallyMoved = failed.filter((m) => devicesNow.get(m.serial)?.ou === m.to);
  if (actuallyMoved.length) problems.push(`有 ${actuallyMoved.length} 台回報失敗，但目錄顯示其實已經在目標組織單位：${actuallyMoved.slice(0, 5).map((m) => m.serial).join("、")}${actuallyMoved.length > 5 ? "…" : ""}`);
  return problems;
}
