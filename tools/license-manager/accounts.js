// 帳號批次作業：批次新增帳號、批次轉移組織單位。純邏輯在 accounts_logic.js，API 在 accounts_api.js，表格在 table.js。
import { CREATE_FIELDS, MOVE_FIELDS, planCreate, planMove, countOps, runPool, normalizeOu } from "./accounts_logic.js?v=20261123b";
import { dirApi, demoDirApi, ACCOUNT_SCOPES } from "./accounts_api.js?v=20261123b";
import { createTable } from "./table.js?v=20261123b";
import { downloadXlsx } from "./export.js?v=20261123b";
import { CLIENT_ID } from "./config.js?v=20261123b";

const $ = (id) => document.getElementById(id);
const SCOPES = "openid email " + ACCOUNT_SCOPES;
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const MAX_OPS = 500; // 單次最多處理幾筆（保守值，避免貼錯整份名單造成大範圍異動）
const state = { api: null, token: "", domain: "", users: new Map(), ous: new Set(), last: {} };

function ask(title, body, yes = "確定", danger = false) {
  return new Promise((resolve) => {
    $("dlgT").textContent = title; $("dlgB").textContent = body; $("dlgYes").textContent = yes; $("dlgYes").className = danger ? "danger" : "";
    const done = (v) => { $("dlg").close(); resolve(v); };
    $("dlgYes").onclick = () => done(true); $("dlgNo").onclick = () => done(false); $("dlg").showModal();
  });
}
function msg(id, kind, text) { $(id).innerHTML = text ? `<div class="msg ${kind}"></div>` : ""; if (text) $(id).firstChild.textContent = text; }
const pill = (op, label) => { const s = document.createElement("span"); s.className = `pill p-${op}`; s.textContent = label; return s; };

function tokenClient(scope, onToken, onError) {
  if (!CLIENT_ID) return onError(new Error("這個網站還沒設定登入用的用戶端 ID，請聯絡提供這個系統的廠商。"));
  if (!window.google?.accounts) return onError(new Error("Google 登入元件還沒載入完成，請稍等幾秒再按一次。"));
  google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope, callback: (r) => (r.error ? onError(new Error(`登入沒有完成（${r.error}）`)) : onToken(r.access_token)), error_callback: () => onError(new Error("授權視窗被關閉或被瀏覽器擋住")) }).requestAccessToken();
}
const getSheetsToken = () => new Promise((res, rej) => tokenClient(SHEETS_SCOPE, res, rej));

// ---------- 登入與載入目錄 ----------
async function enter(api, label) {
  state.api = api;
  msg("loginMsg", "info", "正在讀取使用者與組織單位…");
  try {
    const [users, ous] = await Promise.all([api.listUsers(), api.listOrgUnits()]);
    state.users = new Map(users.map((u) => [u.email, u])); state.ous = ous;
  } catch (e) { return msg("loginMsg", "err", e.kind === "forbidden" ? "這個帳號沒有權限（需要使用者管理的管理員權限）：" + e.message : "讀取失敗：" + e.message); }
  $("ouList").innerHTML = ""; [...state.ous].sort().forEach((p) => $("ouList").append(new Option(p)));
  $("who").textContent = `${label}：目前有 ${state.users.size} 位使用者、${state.ous.size} 個組織單位（含最上層）。`;
  $("login").classList.add("hidden"); $("app").classList.remove("hidden");
}
$("btnLogin").onclick = () => tokenClient(SCOPES, async (token) => {
  state.token = token;
  try {
    const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } })).json();
    state.domain = (info.email || "").split("@")[1] || "";
    await enter(dirApi(token), `已登入 ${info.email}`);
  } catch (e) { msg("loginMsg", "err", "登入後讀取失敗：" + e.message); }
}, (e) => msg("loginMsg", "err", e.message));
$("btnDemo").onclick = () => { state.domain = "demo.school.tw"; enter(demoDirApi(), "示範模式（不連 Google）"); };
if (/(^|\.)hunglun\.com$/.test(location.hostname)) $("siteLinks").classList.remove("hidden");

// ---------- 兩個表格 ----------
const common = { askConfirm: ask, getSheetsToken, isDemo: () => state.api?.mode === "demo", ouListId: "ouList" };
const gridC = createTable({ ...common, root: $("gridC"), notify: (k, t) => msg("msgC", k, t), rowLimit: MAX_OPS,
  fields: [{ key: "full", label: "姓名", placeholder: "王小明（或分填下面姓氏、名字）", width: 160 }, { key: "last", label: "姓氏", width: 80 }, { key: "first", label: "名字", width: 90 }, { key: "email", label: "電子郵件", placeholder: "s001@school.edu.tw" }, { key: "password", label: "密碼（留白＝系統產生）", type: "password", width: 150 }, { key: "ou", label: "組織單位", type: "ou", placeholder: "/學生/一年級", width: 160 }],
  importFields: CREATE_FIELDS });
const gridM = createTable({ ...common, root: $("gridM"), notify: (k, t) => msg("msgM", k, t), rowLimit: MAX_OPS,
  fields: [{ key: "email", label: "電子郵件", placeholder: "s001@school.edu.tw" }, { key: "ou", label: "目標組織單位", type: "ou", placeholder: "/學生/二年級", width: 260 }], importFields: MOVE_FIELDS });
$("tabs").onclick = (e) => { const t = e.target.dataset?.t; if (!t) return; document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t)); $("p-create").classList.toggle("hidden", t !== "create"); $("p-move").classList.toggle("hidden", t !== "move"); };

// ---------- 預演畫面 ----------
function showPlan(outId, kind, plan, extra) {
  const out = $(outId), c = countOps(plan.actions); out.textContent = "";
  const run = plan.actions.filter((a) => a.op === kind).length, errs = c.error || 0;
  const chips = document.createElement("div"); chips.className = "chips";
  [[kind === "create" ? "新增" : "移動", run], ["跳過", c.skip || 0], ["有問題", errs]].forEach(([l, n]) => { const s = document.createElement("span"); s.className = "chip" + (l === "有問題" && n ? " bad" : ""); s.textContent = `${l} ${n}`; chips.append(s); });
  const box = document.createElement("div"); box.className = "box"; const tb = document.createElement("table");
  tb.innerHTML = "<thead><tr><th>動作</th><th>帳號</th><th>說明</th></tr></thead>"; const body = tb.createTBody();
  const OPL = { create: "新增", move: "移動", skip: "跳過", error: "有問題" };
  for (const a of plan.actions) { const tr = body.insertRow(); tr.insertCell().append(pill(a.op === "error" ? "error" : a.op, OPL[a.op])); tr.insertCell().textContent = a.email; tr.insertCell().textContent = a.op === "move" || (a.from && a.to) ? `${a.from} → ${a.to}（${a.reason}）` : a.op === "create" ? `${a.reason}，放到 ${a.user.ou}` : a.reason; }
  box.append(tb); out.append(chips);
  plan.warnings.forEach((w) => { const d = document.createElement("div"); d.className = "msg warn"; d.textContent = w; out.append(d); });
  if (run > MAX_OPS) { const d = document.createElement("div"); d.className = "msg err"; d.textContent = `一次最多處理 ${MAX_OPS} 筆，請分批。`; out.append(d); }
  else if (errs) { const d = document.createElement("div"); d.className = "msg err"; d.textContent = "有列有問題（看下表「有問題」），請回到表格修正，或刪掉那幾列再預演。有問題的列不會被處理。"; out.append(d); }
  out.append(box);
  const row = document.createElement("div"); row.className = "row";
  const btn = document.createElement("button"); btn.className = "danger"; btn.textContent = kind === "create" ? `建立 ${run} 個帳號` : `移動 ${run} 位使用者`; btn.disabled = !run || run > MAX_OPS; row.append(btn); out.append(row);
  const log = document.createElement("div"); log.className = "log hidden"; const fin = document.createElement("div"); out.append(fin, log);
  btn.onclick = () => execute(kind, plan, { btn, log, fin, extra });
  out.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("planC").onclick = () => {
  const rows = gridC.getRows(); if (!rows.length) return msg("msgC", "err", "表格是空的，請至少填一位。");
  msg("msgC", "", "");
  const domains = new Set([...state.users.keys()].map((e) => e.split("@")[1]));
  showPlan("outC", "create", planCreate(rows, { existing: new Set(state.users.keys()), ous: state.ous, domains, defaultOu: normalizeOu($("defOuC").value, state.domain), domain: state.domain }), {});
};
$("planM").onclick = () => {
  const rows = gridM.getRows(); if (!rows.length) return msg("msgM", "err", "表格是空的，請至少填一位。");
  msg("msgM", "", ""); showPlan("outM", "move", planMove(rows, { users: state.users, ous: state.ous, domain: state.domain }), {});
};
$("exportOu").onclick = async () => {
  try { await downloadXlsx("使用者與組織單位.xlsx", ["電子郵件", "姓名", "組織單位", "狀態"], [...state.users.values()].map((u) => [u.email, u.name, u.ou, u.suspended ? "停權" : "啟用"]), [34, 18, 30, 8]); }
  catch (e) { msg("msgM", "err", e.message); }
};

// ---------- 執行與驗證 ----------
async function execute(kind, plan, { btn, log, fin }) {
  const todo = plan.actions.filter((a) => a.op === kind);
  const verb = kind === "create" ? "建立" : "移動";
  if (!(await ask(`確定要${verb} ${todo.length} ${kind === "create" ? "個帳號" : "位使用者"}嗎？`, kind === "create" ? "這會直接在 Google 後台建立帳號，無法一鍵復原（只能再刪除）。" : "這會直接改動後台的組織單位，會影響套用在該單位的政策與授權。", `確定${verb}`, true))) return;
  btn.disabled = true; log.classList.remove("hidden"); log.textContent = ""; fin.textContent = "";
  const line = (t) => { log.textContent += t + "\n"; log.scrollTop = log.scrollHeight; };
  fin.innerHTML = '<div class="msg info">執行中，請不要關閉這個分頁…</div>';
  let done = 0, stopped = "";
  const t0 = performance.now();
  const results = await runPool(todo, (a) => (kind === "create" ? state.api.createUser({ ...a.user, change: true }) : state.api.moveUser(a.email, a.to)), {
    concurrency: 4, shouldStop: () => !!stopped,
    onResult: (a, r) => {
      done++; line(`${new Date().toLocaleTimeString("zh-TW", { hour12: false })}  ${verb}  ${a.email}  ${r.ok ? "成功" : `失敗（${r.kind}）${r.message}`}  [${done}/${todo.length}]`);
      if (!r.ok && r.kind === "forbidden") stopped = `沒有權限：${r.message}`;
    },
  });
  const ok = results.filter((r) => r?.ok).length, failed = results.filter((r) => r && !r.ok).length, skipped = todo.length - ok - failed;
  line(`\n完成：成功 ${ok}、失敗 ${failed}${skipped ? `、因停手未處理 ${skipped}` : ""}，共 ${((performance.now() - t0) / 1000).toFixed(1)} 秒${stopped ? "，已停手：" + stopped : ""}`);
  // 驗證：重新讀後台（寫入後馬上讀可能是舊資料，所以退避重試）
  let bad = [];
  for (const wait of [0, 3, 6, 12, 24]) {
    await new Promise((r) => setTimeout(r, wait * 1000));
    const users = new Map((await state.api.listUsers()).map((u) => [u.email, u]));
    bad = todo.filter((a, i) => results[i]?.ok && (kind === "create" ? users.get(a.email)?.ou !== a.user.ou : users.get(a.email)?.ou !== a.to));
    if (!bad.length) { state.users = users; break; }
  }
  bad.forEach((a) => line("驗證失敗：" + a.email));
  if (!bad.length) line("驗證：後台目前的狀態與預演一致。");
  const allGood = !bad.length && !failed && !skipped;
  fin.innerHTML = ""; const m = document.createElement("div"); m.className = `msg ${allGood ? "ok" : "err"}`; m.textContent = allGood ? `完成，${ok} 筆全部成功，後台狀態已核對。` : "有項目沒有完成，請看下方紀錄。已成功的不會重複處理，修正後可再預演一次。"; fin.append(m);
  // 結果檔（建立帳號含密碼，只在這裡能拿到）
  const dl = document.createElement("button"); dl.className = "ghost";
  dl.textContent = kind === "create" ? "下載帳號與密碼清單（Excel）" : "下載移動結果（Excel）";
  dl.onclick = async () => {
    try {
      if (kind === "create") await downloadXlsx(`新增帳號結果-${new Date().toISOString().slice(0, 10)}.xlsx`, ["電子郵件", "姓氏", "名字", "初始密碼", "組織單位", "結果"], todo.map((a, i) => [a.email, a.user.last, a.user.first, a.user.password, a.user.ou, results[i]?.ok ? "成功" : `失敗：${results[i]?.message || "未處理"}`]), [34, 10, 12, 18, 26, 30]);
      else await downloadXlsx(`移動結果-${new Date().toISOString().slice(0, 10)}.xlsx`, ["電子郵件", "原組織單位", "新組織單位", "結果"], todo.map((a, i) => [a.email, a.from, a.to, results[i]?.ok ? "成功" : `失敗：${results[i]?.message || "未處理"}`]), [34, 26, 26, 30]);
    } catch (e) { alert_(fin, e.message); }
  };
  fin.append(dl);
  if (kind === "create") { const w = document.createElement("div"); w.className = "msg warn"; w.textContent = "初始密碼只會在這個畫面保留，關閉或重新整理後就拿不到了，請現在下載。新帳號第一次登入需要改密碼。"; fin.append(w); }
  state.last = { kind, todo, results };
}
function alert_(host, text) { const d = document.createElement("div"); d.className = "msg err"; d.textContent = text; host.append(d); }
