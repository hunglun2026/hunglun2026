// 畫面與流程：四步一頁。邏輯在 logic.js，與 Google 溝通在 api.js。
import { SKUS, DEFAULT_MAX, HARD_MAX, planMany, totalCounts, checkAvailable, verifyMany, executeMany, licensesOf } from "./logic.js?v=20261123c";
import { createGrid } from "./grid.js?v=20261123c";
import { downloadXlsx } from "./export.js?v=20261123c";
import { realApi, demoApi } from "./api.js?v=20261126a";
import { CLIENT_ID } from "./config.js?v=20261127e";

const $ = (id) => document.getElementById(id);
const SCOPES = "openid email https://www.googleapis.com/auth/apps.licensing https://www.googleapis.com/auth/admin.directory.user.readonly";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const OP_LABEL = { add: "指派", remove: "收回", skip: "跳過", error: "出錯" };
const state = { apis: {}, mode: "", token: "", plans: null, keys: [], lists: null, rows: [], held: null, known: null };

// ---- 自己做的對話框（不用瀏覽器內建 confirm） ----
function ask(title, body, yes = "確定", danger = false) {
  return new Promise((resolve) => {
    $("dlgT").textContent = title; $("dlgB").textContent = body;
    $("dlgYes").textContent = yes; $("dlgYes").className = danger ? "danger" : "";
    const done = (v) => { $("dlg").close(); resolve(v); };
    $("dlgYes").onclick = () => done(true); $("dlgNo").onclick = () => done(false);
    $("dlg").showModal();
  });
}
function msg(id, kind, text) { $(id).innerHTML = text ? `<div class="msg ${kind}"></div>` : ""; if (text) $(id).firstChild.textContent = text; }
function show(n) {
  for (let i = 0; i <= 4; i++) $("s" + i).classList.toggle("hidden", i !== n);
  document.querySelectorAll("#steps li").forEach((li) => { const s = +li.dataset.s; li.className = s === n ? "on" : s < n ? "done" : ""; });
  if (n === 2 || n === 3) renderChosenBar(n);
  window.scrollTo(0, 0);
}
// 勾選的授權（至少一種），依 SKUS 的順序
const chosen = () => Object.keys(SKUS).filter((k) => $("sk_" + k)?.checked);
const demoMode = () => state.mode === "demo";
// 名單頁與預演頁最上方：這次要處理的授權（名單裡的指派、收回都是針對這幾種）。預演頁用實際算預演的那幾種。
function renderChosenBar(n) {
  const keys = n === 3 && state.keys.length ? state.keys : chosen(), bar = $("chosenBar" + n); bar.textContent = "";
  const sc = document.createElement("b"); sc.textContent = demoMode() ? "學校：示範資料　" : `學校網域：${schoolDomain()}　`; bar.append(sc);
  const b = document.createElement("b"); b.textContent = "目前要指派的授權："; bar.append(b);
  keys.forEach((k) => bar.append(Object.assign(document.createElement("span"), { className: "pick", textContent: SKUS[k].name })));
  bar.append(Object.assign(document.createElement("small"), { textContent: n === 2 ? "名單裡的「指派」「收回」都是針對上面這幾種；要增減請按最下面的「上一步」回到步驟 2 重新勾選。" : "預演與執行都只動上面這幾種授權。" }));
}

// ---- 名單表格（步驟 3） ----
// 讀取試算表的權限只在使用者按「匯入 Google 試算表」時才額外請求（漸進授權），平常登入只要授權管理與讀取使用者
function getSheetsToken() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID || !window.google?.accounts) return reject(new Error("請先在步驟 2 用 Google 登入"));
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SHEETS_SCOPE,
      callback: (r) => (r.error ? reject(new Error(`沒有取得讀取試算表的權限（${r.error}）`)) : resolve(r.access_token)),
      error_callback: () => reject(new Error("授權視窗被關閉或被瀏覽器擋住")),
    }).requestAccessToken();
  });
}
const grid = createGrid({ notify: (kind, text) => msg("s2msg", kind, text), askConfirm: ask, getSheetsToken, isDemo: () => demoMode(), licenseText: (email) => (state.held ? (state.known && !state.known.has(email) ? "unknown" : licensesOf(email, state.held)) : state.mode ? "loading" : null) });
if (/(^|\.)hunglun\.com$/.test(location.hostname)) $("siteLinks").classList.remove("hidden");

// ---- 步驟 2：登入（步驟 1 是先設定，只有說明，沒有程式） ----
for (const [k, v] of Object.entries(SKUS)) {
  const lab = document.createElement("label"), cb = Object.assign(document.createElement("input"), { type: "checkbox", id: "sk_" + k, checked: k === "ai-pro" });
  lab.append(cb, v.name); $("skuBox").append(lab);
  const row = document.createElement("div"); row.className = "a"; row.id = "avrow_" + k; row.classList.toggle("hidden", k !== "ai-pro");
  row.append(Object.assign(document.createElement("span"), { textContent: v.name }), Object.assign(document.createElement("input"), { type: "number", id: "av_" + k, min: 0, placeholder: "例如 10" }));
  $("availBox").append(row);
  cb.onchange = () => {
    row.classList.toggle("hidden", !cb.checked);
  };
}
// 讀四種授權目前的持有者（唯讀），讓名單表格顯示「這個帳號現在有什麼」；失敗就不顯示，不影響其他功能
async function loadHeld() {
  state.held = null; state.known = null; grid.refreshLicenses();
  try {
    const keys = Object.keys(SKUS), [users, ...sets] = await Promise.all([state.apis[keys[0]].listUsers(), ...keys.map((k) => state.apis[k].listHolders())]);
    state.known = new Set(users.map((u) => u.email.toLowerCase()));
    state.held = Object.fromEntries(keys.map((k, i) => [k, sets[i]]));
  } catch (e) { state.held = null; msg("s2msg", "warn", "讀不到目前的授權狀況（" + e.message + "），表格不會顯示「目前已有的授權」，但預演仍會重新確認。"); }
  grid.refreshLicenses();
}
const schoolDomain = () => $("domain").value.trim().toLowerCase().replace(/^@/, "");
function buildApis() { state.apis = {}; const d = schoolDomain(); for (const k of Object.keys(SKUS)) state.apis[k] = realApi(state.token, d, SKUS[k], !!state.loginDomain && state.loginDomain !== d); }

function startReal() {
  if (!chosen().length) return msg("s1msg", "err", "請至少勾選一種要管理的授權。");
  if (schoolDomain() && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(schoolDomain())) return msg("s1msg", "err", "學校網域格式不對，例如 school.edu.tw；不填的話會用登入帳號的網域。");
  if (!CLIENT_ID) return msg("s1msg", "err", "這個網站還沒設定登入用的用戶端 ID（config.js），請聯絡提供這個系統的廠商。");
  if (!window.google?.accounts) return msg("s1msg", "warn", "Google 登入元件還沒載入完成，請稍等幾秒再按一次。");
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES,
    callback: async (r) => {
      if (r.error) return msg("s1msg", "err", `登入沒有完成（${r.error}）。若出現「未經驗證的應用程式」，請讓廠商協助設定。`);
      state.token = r.access_token;
      try {
        const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${r.access_token}` } })).json();
        state.loginDomain = ((info.email || "").split("@")[1] || "").toLowerCase();
        const typed = !!schoolDomain();
        if (!typed) $("domain").value = state.loginDomain;
        const d = schoolDomain();
        msg("s1msg", state.loginDomain && state.loginDomain !== d ? "warn" : "ok", `已登入：${info.email}。這次要處理的學校：${d}` + (typed ? "" : "（沒填網域，已用登入帳號的網域；若要處理別間學校，請回上一步填網域）") + (state.loginDomain && state.loginDomain !== d ? "（和登入帳號的網域不同，請確認這個帳號有權限管理該校）" : ""));
      } catch { state.loginDomain = ""; msg("s1msg", "warn", "已登入，但讀不到帳號資訊，請自己填學校網域。"); }
      if (!schoolDomain()) return;
      state.mode = "real"; buildApis(); loadHeld();
      show(2);
    },
  });
  client.requestAccessToken();
}
$("btnLogin").onclick = startReal;
$("btnDemo").onclick = () => {
  if (!chosen().length) return msg("s1msg", "err", "請至少勾選一種要管理的授權。");
  state.mode = "demo"; state.apis = {};
  // 示範：每種授權的持有者不同，名單表格的「目前已有的授權」才看得出差別（AI Pro 與 Plus 的收回位子剛好夠換人，示範才走得通）
  const HELD = { "ai-pro": ["a", "b", "c", "keep"], "teaching-learning": ["a"], plus: ["a", "b", "c", "keep"], "plus-staff": ["keep"] };
  for (const k of Object.keys(SKUS)) state.apis[k] = demoApi({ heldBy: HELD[k].map((n) => `${n}@demo.school.tw`) });
  for (const k of chosen()) $("av_" + k).value = 0; // 示範：後台目前沒有空位，要靠收回的位子換人
  grid.setRows([...["d", "e", "f", "n"].map((n) => ({ email: `${n}@demo.school.tw`, action: "add" })), ...["a", "b", "c"].map((n) => ({ email: `${n}@demo.school.tw`, action: "revoke" })), { email: "keep@demo.school.tw", action: "keep" }]);
  loadHeld(); show(2); msg("s2msg", "info", "這是示範資料，不會連到 Google，也不會改到任何真實帳號。名單已先填好，可以直接往下走一遍。");
};

// ---- 步驟 3 → 4 ----
$("back2").onclick = () => show(1);
$("btnPlan").onclick = async () => {
  const lists = grid.getLists();
  if (lists.invalid) return msg("s2msg", "err", `有 ${lists.invalid} 列不是有效的電子郵件（紅色格子），請修正或刪除後再繼續。`);
  if (!lists.add.length && !lists.revoke.length) return msg("s2msg", "err", "表格裡沒有要指派或收回的人，請至少填一位。");
  $("btnPlan").disabled = true; msg("s2msg", "info", "正在讀取目前的使用者與授權狀況…");
  try {
    const keys = state.keys = chosen(); if (!keys.length) throw new Error("請至少勾選一種授權（回上一步）");
    const [users, ...held] = await Promise.all([state.apis[keys[0]].listUsers(), ...keys.map((k) => state.apis[k].listHolders())]);
    const holdersBy = Object.fromEntries(keys.map((k, i) => [k, held[i]]));
    state.lists = lists;
    state.plans = planMany(keys, { add: lists.add, revoke: lists.revoke, keep: lists.keep, users, holdersBy });
    renderPlan(); show(3);
  } catch (e) {
    msg("s2msg", "err", e.kind === "forbidden" ? "這個帳號沒有權限（需要「授權管理」與讀取使用者的管理員權限）：" + e.message : "讀取失敗：" + e.message);
  } finally { $("btnPlan").disabled = false; }
};

function maxValue() { return Math.min(HARD_MAX, Math.max(1, Math.floor(+$("maxIn").value) || DEFAULT_MAX)); }
function renderPlan() {
  const plans = state.plans, c = totalCounts(plans), many = plans.length > 1;
  $("sum").innerHTML = `<div class="s-remove">收回 ${c.remove}</div><div class="s-add">指派 ${c.add}</div><div class="s-skip">跳過 ${c.skip}</div><div class="s-error">出錯 ${c.error}</div>`;
  const tbody = $("planRows"); tbody.textContent = "";
  tbody.parentElement.tHead.rows[0].innerHTML = `<th>動作</th>${many ? "<th>授權</th>" : ""}<th>帳號</th><th>說明</th>`;
  const problems = [];
  for (const p of plans) {
    for (const a of p.plan.actions) {
      const tr = tbody.insertRow(); tr.className = `r-${a.op}`;
      const pill = document.createElement("span"); pill.className = `pill p-${a.op}`; pill.textContent = OP_LABEL[a.op];
      tr.insertCell().appendChild(pill); if (many) tr.insertCell().textContent = p.name; tr.insertCell().textContent = a.email; tr.insertCell().textContent = a.reason;
    }
    const q = checkAvailable(p.plan.actions, $("av_" + p.key).value);
    if (q) problems.push(`${many ? p.name + "：" : ""}額度不足：${q}`);
    problems.push(...p.plan.warnings.map((w) => (many ? `${p.name}：${w}` : w)));
  }
  const n = c.add + c.remove;
  if (c.error) problems.push("名單有找不到的人，請回上一步修正");
  if (n > maxValue()) problems.push(`要異動 ${n} 筆，超過單次上限 ${maxValue()}，請調高上方的上限（最高 ${HARD_MAX}），或回上一步分批`);
  msg("s3msg", problems.length ? "err" : "ok", problems.length ? problems.join("；") : "預演沒有問題。");
  $("btnRun").disabled = problems.length > 0 || n === 0;
  if (!problems.length && n === 0) msg("s3msg", "info", "沒有需要異動的項目，目前狀態已經符合名單。");
}
$("maxIn").oninput = () => { if (state.plans) renderPlan(); };
$("maxIn").value = DEFAULT_MAX;
$("back3").onclick = () => show(2);

// ---- 步驟 5 ----
$("btnRun").onclick = async () => {
  const c = totalCounts(state.plans), many = state.plans.length > 1;
  if (!(await ask("確定要執行嗎？", `學校：${demoMode() ? "示範資料" : schoolDomain()}。即將收回 ${c.remove} 筆、指派 ${c.add} 筆的授權${many ? `（共 ${state.plans.length} 種授權，一種一種依序做）` : ""}，這會直接改到後台。`, "確定執行", true))) return;
  show(4); state.rows = []; const log = $("log"); log.textContent = ""; msg("s4msg", "info", "執行中，請不要關閉這個分頁…");
  const line = (t, cls = "") => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = t + "\n"; log.append(s); log.scrollTop = log.scrollHeight; };
  const result = await executeMany(state.plans, (k) => state.apis[k], {
    maxChanges: maxValue(),
    onLicense: (p) => { if (many) line(`── ${p.name} ──`, "l-wait"); },
    onRow: (r) => { state.rows.push(r); line(`${r.time}  ${OP_LABEL[r.op]}  ${many ? r.license + "  " : ""}${r.email}  ${r.result === "ok" ? "成功" + (r.note ? "（" + r.note + "）" : "") : "失敗（" + r.kind + "）" + (r.message || "")}`, r.result === "ok" ? `l-${r.op}` : "l-fail"); },
    onWait: (e) => line(`      剛收回的位子還沒釋出，稍後重試 ${e}`, "l-wait"),
  });
  line(`\n完成：成功 ${result.ok}、失敗 ${result.failed}${result.stopped ? "，已停手：" + result.stopped : ""}${result.notRun.length ? "；還沒做：" + result.notRun.join("、") : ""}`, result.failed ? "l-fail" : "l-ok");
  let problems = [];
  for (const wait of [0, 3, 6, 12, 24]) { // 剛寫完馬上查會看到舊資料，所以退避重試
    await new Promise((r) => setTimeout(r, wait * 1000));
    const held = await Promise.all(state.plans.map((p) => state.apis[p.key].listHolders()));
    problems = verifyMany(state.plans.filter((p) => !result.notRun.includes(p.name)), Object.fromEntries(state.plans.map((p, i) => [p.key, held[i]])));
    if (!problems.length) break;
  }
  loadHeld();
  problems.forEach((p) => line("驗證失敗：" + p, "l-fail"));
  if (!problems.length && !result.failed && !result.notRun.length) { line("驗證：後台目前持有者與名單一致。", "l-ok"); msg("s4msg", "ok", "完成，後台狀態已和名單一致。"); }
  else msg("s4msg", "err", "有項目沒有完成，請看下方紀錄；可以回到步驟 3 修正後再跑一次（已完成的不會重複異動）。");
};
$("btnXlsx").onclick = () => downloadXlsx(`授權調整結果-${new Date().toISOString().slice(0, 10)}.xlsx`, ["時間", "動作", "授權", "帳號", "結果", "說明"], state.rows.map((r) => [r.time, OP_LABEL[r.op], r.license || "", r.email, r.result === "ok" ? "成功" : "失敗", r.result === "ok" ? "" : `${r.kind || ""} ${r.message || ""}`.trim()]), [12, 8, 28, 34, 8, 50]).catch((e) => msg("s4msg", "err", e.message));
$("btnCopy").onclick = () => navigator.clipboard?.writeText($("log").textContent);
$("btnAgain").onclick = () => { grid.clear(); show(2); };
$("btnPreOk").onclick = () => show(1);
$("back1").onclick = () => show(0);
show(0);
