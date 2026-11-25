// 畫面與流程：五步一頁。邏輯在 logic.js，與 Google 溝通在 api.js，讀來源在 sheet.js。
import { DEFAULT_MAX, HARD_MAX, detectTable, rowsFromTable, parsePasted, planMoves, countOps, checkPlan, executeMoves, buildUndoRows, verifyMoves } from "./logic.js?v=20261125a";
import { realApi, demoApi, SCOPES } from "./api.js?v=20261125a";
import { openFile, pickBestTab, googleSheetSource, demoSheetSource } from "./sheet.js?v=20261125a";
import { downloadXlsx } from "./export.js?v=20261125a";
import { CLIENT_ID } from "./config.js?v=20261125a";

const $ = (id) => document.getElementById(id);
const OP = { move: "移動", skip: "跳過", error: "出錯" };
const state = { api: null, token: "", domain: "", users: null, ous: null, src: null, table: null, rows: [], actions: [], run: null, stop: false };

// ---- 共用小工具 ----
function ask(title, body, yes = "確定", danger = false) { // 自己做的對話框，不用瀏覽器內建 confirm
  return new Promise((resolve) => {
    $("dlgT").textContent = title; $("dlgB").textContent = body;
    $("dlgYes").textContent = yes; $("dlgYes").className = danger ? "danger" : "";
    const done = (v) => { $("dlg").close(); resolve(v); };
    $("dlgYes").onclick = () => done(true); $("dlgNo").onclick = () => done(false);
    $("dlg").showModal();
  });
}
function msg(id, kind, text) { const el = $(id); el.textContent = ""; if (!text) return; const d = document.createElement("div"); d.className = `msg ${kind}`; d.textContent = text; el.append(d); }
function show(n) {
  for (let i = 0; i <= 4; i++) $("s" + i).classList.toggle("hidden", i !== n);
  document.querySelectorAll("#steps li").forEach((li) => { const s = +li.dataset.s; li.className = s === n ? "on" : s < n ? "done" : ""; });
  window.scrollTo(0, 0);
}
function fillSelect(sel, options, value) { sel.textContent = ""; options.forEach(([v, t]) => sel.add(new Option(t, v))); sel.value = String(value); }
const today = () => new Date().toISOString().slice(0, 10);

// ---- 步驟 1：登入 ----
function startReal() {
  if (!CLIENT_ID) return msg("m0", "err", "這個網站還沒設定登入用的用戶端 ID（config.js），請聯絡提供這個系統的廠商。");
  if (!window.google?.accounts) return msg("m0", "warn", "Google 登入元件還沒載入完成，請稍等幾秒再按一次。");
  google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES,
    callback: async (r) => {
      if (r.error) return msg("m0", "err", `登入沒有完成（${r.error}）。若出現「存取權遭拒」，是你的信箱還沒加進測試名單。`);
      state.token = r.access_token;
      try {
        const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${r.access_token}` } })).json();
        state.domain = (info.email || "").split("@")[1] || "";
        state.api = realApi(state.token);
        await loadDirectory(`已登入：${info.email}`);
      } catch (e) { msg("m0", "err", e.kind === "forbidden" ? "這個帳號沒有讀取使用者與組織單位的權限，請改用超級管理員：" + e.message : "登入後讀取目錄失敗：" + e.message); }
    },
  }).requestAccessToken();
}
async function loadDirectory(who) {
  msg("m0", "info", "正在讀取使用者與組織單位…");
  [state.users, state.ous] = await Promise.all([state.api.listUsers(), state.api.listOrgUnits()]);
  const list = $("ouList"); list.textContent = "";
  [...state.ous].sort().forEach((o) => list.append(Object.assign(document.createElement("option"), { value: o })));
  msg("m0", "ok", `${who}；目錄共 ${state.users.size} 位使用者、${state.ous.size} 個組織單位。`);
  show(1);
}
$("btnLogin").onclick = startReal;
$("btnDemo").onclick = async () => {
  state.api = demoApi(); state.domain = "demo.school.tw";
  await loadDirectory("示範模式（不連 Google，不會改到任何真實帳號）");
  $("pasteBox").value = "s1@demo.school.tw,/學生/二年級\ns2@demo.school.tw,/學生/二年級\ns4@demo.school.tw,/畢業生";
  msg("m1", "info", "這是示範資料，名單已先填好，按「讀取貼上的名單」就能走一遍。");
};

// ---- 步驟 2：名單 ----
document.querySelectorAll("#tabs button").forEach((b) => {
  b.onclick = () => { document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); for (const t of ["paste", "file", "sheet"]) $("t-" + t).classList.toggle("hidden", t !== b.dataset.t); };
});
function setTable(rows2d, label) {
  const t = detectTable(rows2d);
  if (!t.ok) { $("colBox").classList.add("hidden"); $("btnPlan").disabled = true; return msg("m1", "err", `「${label}」裡找不到任何電子郵件，請確認選對檔案與分頁。`); }
  state.table = t;
  const cols = t.headers.map((h, i) => [i, h]);
  fillSelect($("emailSel"), cols, t.emailCol);
  fillSelect($("ouSel"), [[-1, "（名單沒有這一欄，用統一目標）"], ...cols], t.ouCol);
  $("colBox").classList.remove("hidden"); $("btnPlan").disabled = false; renderPreview();
  msg("m1", "ok", `讀到「${label}」：${t.emailTotal} 筆信箱。請確認下面兩個欄位選對了。`);
}
function currentRows() { return rowsFromTable(state.table, { emailCol: +$("emailSel").value, ouCol: +$("ouSel").value }); }
function renderPreview() {
  const rows = currentRows(), box = $("preview"); box.textContent = "";
  const tb = document.createElement("table"), head = tb.createTHead().insertRow();
  ["信箱", "目標組織單位"].forEach((h) => head.append(Object.assign(document.createElement("th"), { textContent: h })));
  const body = tb.createTBody();
  rows.slice(0, 8).forEach((r) => { const tr = body.insertRow(); tr.insertCell().textContent = r.email; tr.insertCell().textContent = r.ou || "（用統一目標）"; });
  if (rows.length > 8) { const tr = body.insertRow(), td = tr.insertCell(); td.colSpan = 2; td.textContent = `…另外還有 ${rows.length - 8} 筆`; }
  box.append(tb);
}
$("emailSel").onchange = $("ouSel").onchange = renderPreview;
$("btnPaste").onclick = () => { const rows = parsePasted($("pasteBox").value); setTable(rows.map((r) => [r.email, r.ou]), "貼上的名單"); };
async function useSource(src) {
  state.src = src; const tab = await pickBestTab(src);
  const sel = $("tabSel"); sel.textContent = ""; src.tabs.forEach((t) => sel.add(new Option(t, t))); if (tab) sel.value = tab;
  $("tabPick").classList.toggle("hidden", src.tabs.length <= 1);
  setTable(await src.load(tab), src.label + (tab && src.tabs.length > 1 ? `（${tab}）` : ""));
}
$("tabSel").onchange = async () => { try { setTable(await state.src.load($("tabSel").value), `${state.src.label}（${$("tabSel").value}）`); } catch (e) { msg("m1", "err", e.message); } };
$("fileIn").onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; try { await useSource(await openFile(f)); } catch (e) { msg("m1", "err", e.message); } };
function getSheetsToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts) return reject(new Error("請先在步驟 1 用 Google 登入"));
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", // 只有按「讀取試算表」才額外請求（漸進授權）
      callback: (r) => (r.error ? reject(new Error(`沒有取得讀取試算表的權限（${r.error}）`)) : resolve(r.access_token)),
      error_callback: () => reject(new Error("授權視窗被關閉或被瀏覽器擋住")),
    }).requestAccessToken();
  });
}
$("btnSheet").onclick = async () => {
  try { await useSource(state.api.mode === "demo" ? demoSheetSource() : await googleSheetSource($("sheetUrl").value, getSheetsToken)); }
  catch (e) { msg("m1", "err", e.message); }
};
$("back1").onclick = () => show(0);

// ---- 步驟 3：預演 ----
async function planFrom(rows, defaultOu, msgId) {
  msg(msgId, "info", "正在重新讀取目前的使用者與組織單位…");
  [state.users, state.ous] = await Promise.all([state.api.listUsers(), state.api.listOrgUnits()]);
  const def = String(defaultOu || "").trim();
  state.actions = planMoves(rows, { users: state.users, ous: state.ous, domain: state.domain, defaultOu: def });
  renderPlan(); show(2);
}
$("btnPlan").onclick = async () => {
  const rows = currentRows(); if (!rows.length) return msg("m1", "err", "名單是空的。");
  $("btnPlan").disabled = true;
  try { await planFrom(rows, $("defOu").value, "m1"); }
  catch (e) { msg("m1", "err", "讀取失敗：" + e.message); } finally { $("btnPlan").disabled = false; }
};
function maxValue() { return Math.min(HARD_MAX, Math.max(1, Math.floor(+$("maxIn").value) || DEFAULT_MAX)); }
function renderPlan() {
  const c = countOps(state.actions);
  $("sum").innerHTML = `<div class="s-move">移動 ${c.move}</div><div class="s-skip">跳過 ${c.skip}</div><div class="s-error">出錯 ${c.error}</div>`;
  const tbody = $("planRows"); tbody.textContent = "";
  for (const a of state.actions) {
    const tr = tbody.insertRow(); tr.className = `r-${a.op}`;
    const pill = Object.assign(document.createElement("span"), { className: `pill p-${a.op}`, textContent: OP[a.op] });
    tr.insertCell().append(pill);
    [a.email, a.from || "", a.to || "", a.reason].forEach((t) => { tr.insertCell().textContent = t; });
  }
  checkPlanUi();
}
function checkPlanUi() {
  const c = countOps(state.actions), problems = checkPlan(state.actions, maxValue());
  msg("m2", problems.length ? "err" : c.move ? "ok" : "info", problems.length ? problems.join("；") : c.move ? `預演沒有問題，會移動 ${c.move} 位。` : "沒有需要移動的人，大家已經在目標組織單位了。");
  $("btnRun").disabled = problems.length > 0 || c.move === 0;
}
$("maxIn").oninput = checkPlanUi;
$("back2").onclick = () => show(1);

// ---- 步驟 4：執行 ----
const logLine = (t, cls = "") => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = t + "\n"; $("log").append(s); $("log").scrollTop = $("log").scrollHeight; };
$("btnStop").onclick = () => { state.stop = true; $("btnStop").disabled = true; logLine("已要求停止，做完手上這批就停…", "l-info"); };
$("btnRun").onclick = async () => {
  const moves = state.actions.filter((a) => a.op === "move");
  if (!(await ask("確定要調動嗎？", `即將把 ${moves.length} 位使用者調到新的組織單位，這會直接改到後台。\n每位的原組織單位都會記進還原檔，調錯可以調回來。`, "確定執行", true))) return;
  show(3); state.stop = false; $("btnStop").disabled = false; $("log").textContent = ""; msg("m3", "info", "執行中，請不要關閉這個分頁…");
  const t0 = new Date().toTimeString().slice(0, 8);
  const r = await executeMoves(moves, state.api, {
    shouldStop: () => state.stop,
    onBatch: (b) => { $("barFill").style.width = `${Math.round(((b.done + b.failed) / moves.length) * 100)}%`; logLine(`第 ${b.batch}/${b.total} 批：成功 ${b.ok}、失敗 ${b.bad}（累計成功 ${b.done}、失敗 ${b.failed}）`, b.bad ? "l-fail" : "l-ok"); },
  });
  r.failed.forEach((m) => logLine(`失敗 ${m.email}：${m.kind} ${m.message}`, "l-fail"));
  if (r.stopped) logLine(`已停手：${r.stopped}；還有 ${r.notRun.length} 位沒處理`, "l-fail");
  logLine("驗證中：重新讀取目錄，比對每個人現在的組織單位…", "l-info");
  let problems = [];
  for (const wait of [0, 3, 6, 12]) { // 剛寫完立刻讀可能看到舊資料，所以退避重試
    await new Promise((res) => setTimeout(res, wait * 1000));
    try { problems = verifyMoves(r.done, await state.api.listUsers()); } catch (e) { problems = ["讀取目錄失敗：" + e.message]; }
    if (!problems.length) break;
  }
  problems.forEach((p) => logLine("驗證失敗：" + p, "l-fail"));
  if (!problems.length) logLine("驗證：成功移動的人都已在新的組織單位。", "l-ok");
  state.run = { ...r, problems, time: t0, total: moves.length };
  renderResult();
};

// ---- 步驟 5：結果與還原 ----
function renderResult() {
  const r = state.run;
  $("sum4").innerHTML = `<div class="s-move">成功 ${r.done.length}</div><div class="s-error">失敗 ${r.failed.length}</div><div class="s-skip">沒處理 ${r.notRun.length}</div>`;
  const bad = r.failed.length || r.notRun.length || r.problems.length;
  msg("m4", bad ? "err" : "ok", bad ? `有項目沒有完成${r.stopped ? "（" + r.stopped + "）" : ""}，詳見下載的結果檔。已成功的 ${r.done.length} 位都記在還原檔裡。` : `完成，${r.done.length} 位都已調到新的組織單位，並通過驗證。`);
  $("btnUndo").disabled = r.done.length === 0; $("btnUndoFile").disabled = r.done.length === 0;
  show(4);
}
$("btnResult").onclick = () => {
  const r = state.run, row = (m, res, note) => [m.email, m.from, m.to, res, note];
  downloadXlsx(`OU調度結果-${today()}.xlsx`, ["信箱", "原組織單位", "目標組織單位", "結果", "說明"],
    [...r.done.map((m) => row(m, "成功", "")), ...r.failed.map((m) => row(m, "失敗", `${m.kind} ${m.message}`)), ...r.notRun.map((m) => row(m, "沒處理", r.stopped))], [34, 22, 22, 8, 50]).catch((e) => msg("m4", "err", e.message));
};
$("btnUndoFile").onclick = () => downloadXlsx(`OU調度還原檔-${today()}.xlsx`, ["信箱", "目標組織單位"], buildUndoRows(state.run.done), [34, 28]).catch((e) => msg("m4", "err", e.message));
$("btnUndo").onclick = async () => {
  const rows = buildUndoRows(state.run.done).map(([email, ou]) => ({ email, ou }));
  if (!(await ask("要還原這次調動嗎？", `會先做一次預演，列出 ${rows.length} 位要調回原組織單位的人，你確認後才會真的執行。`, "先預演還原"))) return;
  try { await planFrom(rows, "", "m4"); } catch (e) { msg("m4", "err", "讀取失敗：" + e.message); }
};
$("btnAgain").onclick = () => { $("colBox").classList.add("hidden"); $("btnPlan").disabled = true; msg("m1", "", ""); show(1); };
$("maxIn").value = DEFAULT_MAX;
show(0);
