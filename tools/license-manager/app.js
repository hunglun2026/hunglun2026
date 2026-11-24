// 畫面與流程：四步一頁。邏輯在 logic.js，與 Google 溝通在 api.js。
import { SKUS, MAX_CHANGES, planRotation, counts, checkAvailable, verifyAfter, execute } from "./logic.js?v=20261123c";
import { createGrid } from "./grid.js?v=20261123c";
import { downloadXlsx } from "./export.js?v=20261123c";
import { realApi, demoApi } from "./api.js?v=20261123c";
import { CLIENT_ID } from "./config.js?v=20261124e";

const $ = (id) => document.getElementById(id);
const SCOPES = "openid email https://www.googleapis.com/auth/apps.licensing https://www.googleapis.com/auth/admin.directory.user.readonly";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const OP_LABEL = { add: "指派", remove: "收回", skip: "跳過", error: "出錯" };
const state = { api: null, token: "", plan: null, lists: null, rows: [] };

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
  window.scrollTo(0, 0);
}
const sku = () => SKUS[$("sku").value];

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
const grid = createGrid({ notify: (kind, text) => msg("s2msg", kind, text), askConfirm: ask, getSheetsToken, isDemo: () => state.api?.mode === "demo" });
if (/(^|\.)hunglun\.com$/.test(location.hostname)) $("siteLinks").classList.remove("hidden");

// ---- 步驟 2：登入（步驟 1 是先設定，只有說明，沒有程式） ----
for (const [k, v] of Object.entries(SKUS)) $("sku").add(new Option(v.name, k));

function startReal() {
  if (!CLIENT_ID) return msg("s1msg", "err", "這個網站還沒設定登入用的用戶端 ID（config.js），請聯絡提供這個系統的廠商。");
  if (!window.google?.accounts) return msg("s1msg", "warn", "Google 登入元件還沒載入完成，請稍等幾秒再按一次。");
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES,
    callback: async (r) => {
      if (r.error) return msg("s1msg", "err", `登入沒有完成（${r.error}）。若出現「未經驗證的應用程式」，請讓廠商協助設定。`);
      state.token = r.access_token;
      try {
        const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${r.access_token}` } })).json();
        if (!$("domain").value) $("domain").value = (info.email || "").split("@")[1] || "";
        msg("s1msg", "ok", `已登入：${info.email}`);
      } catch { msg("s1msg", "warn", "已登入，但讀不到帳號資訊，請自己填學校網域。"); }
      if (!$("domain").value) return;
      state.api = realApi(state.token, $("domain").value.trim(), sku());
      show(2);
    },
  });
  client.requestAccessToken();
}
$("btnLogin").onclick = startReal;
$("btnDemo").onclick = () => {
  state.api = demoApi();
  $("avail").value = 0; // 示範：後台目前沒有空位，要靠收回的位子換人
  grid.setRows([...["d", "e", "f", "n"].map((n) => ({ email: `${n}@demo.school.tw`, action: "add" })), ...["a", "b", "c"].map((n) => ({ email: `${n}@demo.school.tw`, action: "revoke" })), { email: "keep@demo.school.tw", action: "keep" }]);
  show(2); msg("s2msg", "info", "這是示範資料，不會連到 Google，也不會改到任何真實帳號。名單已先填好，可以直接往下走一遍。");
};
$("sku").onchange = () => { if (state.api?.mode === "real") state.api = realApi(state.token, $("domain").value.trim(), sku()); };

// ---- 步驟 3 → 4 ----
$("back2").onclick = () => show(1);
$("btnPlan").onclick = async () => {
  const lists = grid.getLists();
  if (lists.invalid) return msg("s2msg", "err", `有 ${lists.invalid} 列不是有效的電子郵件（紅色格子），請修正或刪除後再繼續。`);
  if (!lists.add.length && !lists.revoke.length) return msg("s2msg", "err", "表格裡沒有要指派或收回的人，請至少填一位。");
  $("btnPlan").disabled = true; msg("s2msg", "info", "正在讀取目前的使用者與授權狀況…");
  try {
    const [users, holders] = await Promise.all([state.api.listUsers(), state.api.listHolders()]);
    state.lists = lists;
    state.plan = planRotation({ add: lists.add, revoke: lists.revoke, keep: lists.keep, users, holders });
    renderPlan(); show(3);
  } catch (e) {
    msg("s2msg", "err", e.kind === "forbidden" ? "這個帳號沒有權限（需要「授權管理」與讀取使用者的管理員權限）：" + e.message : "讀取失敗：" + e.message);
  } finally { $("btnPlan").disabled = false; }
};

function renderPlan() {
  const { actions, warnings } = state.plan, c = counts(actions);
  $("sum").innerHTML = `<div class="s-remove">收回 ${c.remove}</div><div class="s-add">指派 ${c.add}</div><div class="s-skip">跳過 ${c.skip}</div><div class="s-error">出錯 ${c.error}</div>`;
  const tbody = $("planRows"); tbody.textContent = "";
  for (const a of actions) {
    const tr = tbody.insertRow(); tr.className = `r-${a.op}`;
    const pill = document.createElement("span"); pill.className = `pill p-${a.op}`; pill.textContent = OP_LABEL[a.op];
    tr.insertCell().appendChild(pill); tr.insertCell().textContent = a.email; tr.insertCell().textContent = a.reason;
  }
  const quota = checkAvailable(actions, $("avail").value);
  const problems = [...warnings, ...(quota ? [`額度不足：${quota}`] : []), ...(c.error ? ["名單有找不到的人，請回上一步修正"] : []), ...(c.add + c.remove > MAX_CHANGES ? [`要異動 ${c.add + c.remove} 位，超過單次上限 ${MAX_CHANGES}，請回上一步分批`] : [])];
  msg("s3msg", problems.length ? "err" : "ok", problems.length ? problems.join("；") : "預演沒有問題。");
  $("btnRun").disabled = problems.length > 0 || c.add + c.remove === 0;
  if (!problems.length && c.add + c.remove === 0) msg("s3msg", "info", "沒有需要異動的項目，目前狀態已經符合名單。");
}
$("back3").onclick = () => show(2);

// ---- 步驟 5 ----
$("btnRun").onclick = async () => {
  const c = counts(state.plan.actions);
  if (!(await ask("確定要執行嗎？", `即將收回 ${c.remove} 位、指派 ${c.add} 位的授權，這會直接改到後台。`, "確定執行", true))) return;
  show(4); state.rows = []; const log = $("log"); log.textContent = ""; msg("s4msg", "info", "執行中，請不要關閉這個分頁…");
  const line = (t, cls = "") => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = t + "\n"; log.append(s); log.scrollTop = log.scrollHeight; };
  const result = await execute(state.plan.actions, state.api, {
    onRow: (r) => { state.rows.push(r); line(`${r.time}  ${OP_LABEL[r.op]}  ${r.email}  ${r.result === "ok" ? "成功" + (r.note ? "（" + r.note + "）" : "") : "失敗（" + r.kind + "）" + (r.message || "")}`, r.result === "ok" ? `l-${r.op}` : "l-fail"); },
    onWait: (e, w) => line(`      剛收回的位子還沒釋出，${w} 秒後重試 ${e}`, "l-wait"),
  }).catch((e) => ({ ok: 0, failed: 1, stopped: e.message, rows: [] }));
  line(`\n完成：成功 ${result.ok}、失敗 ${result.failed}${result.stopped ? "，已停手：" + result.stopped : ""}`, result.failed ? "l-fail" : "l-ok");
  let problems = [];
  for (const wait of [0, 3, 6, 12, 24]) { // 剛寫完馬上查會看到舊資料，所以退避重試
    await new Promise((r) => setTimeout(r, wait * 1000));
    problems = verifyAfter(state.plan.actions, await state.api.listHolders());
    if (!problems.length) break;
  }
  problems.forEach((p) => line("驗證失敗：" + p, "l-fail"));
  if (!problems.length && !result.failed) { line("驗證：後台目前持有者與名單一致。", "l-ok"); msg("s4msg", "ok", "完成，後台狀態已和名單一致。"); }
  else msg("s4msg", "err", "有項目沒有完成，請看下方紀錄；可以回到步驟 3 修正後再跑一次（已完成的不會重複異動）。");
};
$("btnXlsx").onclick = () => downloadXlsx(`授權調整結果-${new Date().toISOString().slice(0, 10)}.xlsx`, ["時間", "動作", "帳號", "結果", "說明"], state.rows.map((r) => [r.time, OP_LABEL[r.op], r.email, r.result === "ok" ? "成功" : "失敗", r.result === "ok" ? "" : `${r.kind || ""} ${r.message || ""}`.trim()]), [12, 8, 34, 8, 50]).catch((e) => msg("s4msg", "err", e.message));
$("btnCopy").onclick = () => navigator.clipboard?.writeText($("log").textContent);
$("btnAgain").onclick = () => { grid.clear(); show(2); };
$("btnPreOk").onclick = () => show(1);
$("back1").onclick = () => show(0);
show(0);
