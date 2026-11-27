// 排程頁的畫面與流程。純邏輯在 schedule-lib.js，連後端與示範版在 schedule-api.js。
// 使用者輸入的文字（信箱、網域）一律用 textContent 放進畫面，不用 innerHTML。
import { SKUS, parseEmails } from "./logic.js?v=20261123c";
import { CLIENT_ID, SCHEDULER_API } from "./config.js?v=20261127f";
import { realScheduleApi, demoScheduleApi } from "./schedule-api.js?v=20261127f";
import { STATUS_LABEL, TYPE_LABEL, buildBody, describeNext, describeRun, allowedActions, errorText, twToday, addMonths, monthLabel, firstSelectable, monthRange, findDupes, monthlySummary, dateInMonth, keyDate, batchKey, dateLabel } from "./schedule-lib.js?v=20261127f";

const $ = (id) => document.getElementById(id);
const state = { api: null, me: null, token: "", lastBody: null };

function ask(title, body, yes = "確定", danger = false) {
  return new Promise((resolve) => {
    $("dlgT").textContent = title; $("dlgB").textContent = body;
    $("dlgYes").textContent = yes; $("dlgYes").className = danger ? "danger" : "";
    const done = (v) => { $("dlg").close(); resolve(v); };
    $("dlgYes").onclick = () => done(true); $("dlgNo").onclick = () => done(false);
    $("dlg").showModal();
  });
}
function msg(id, kind, text) { const el = $(id); el.textContent = ""; if (!text) return; const d = document.createElement("div"); d.className = `msg ${kind}`; d.textContent = text; el.append(d); }
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
async function guard(msgId, fn) { try { return await fn(); } catch (e) { msg(msgId, "err", errorText(e)); if (e.status === 401) msg("loginMsg", "warn", "登入已過期，請重新登入"); } }

// ---------- 登入 ----------
const apiBase = () => { const q = new URLSearchParams(location.search).get("api"); return (q && location.hostname === "localhost") ? q : SCHEDULER_API; }; // 本機測試才允許用 ?api= 指到本機 Worker
async function enter(api, label) {
  state.api = api; state.me = await api.me();
  $("login").classList.add("hidden"); $("app").classList.remove("hidden");
  $("modebar").classList.toggle("hidden", api.mode !== "demo");
  $("modebar").textContent = "示範模式：資料都在這個頁面的記憶體裡，不會連到 Google，也不會改到任何真實帳號。";
  $("who").textContent = `${label}${state.me.email}（${state.me.staff ? "鴻綸" : "學校管理員"}）`;
  $("staffCard").classList.toggle("hidden", !state.me.staff);
  $("btnPause").textContent = state.me.paused ? "解除全域暫停" : "全域暫停所有排程";
  await refresh();
}
function initGoogle() {
  const base = apiBase();
  if (!base) { msg("loginMsg", "info", "排程後端還沒上線，目前只能用下面的示範身分練習畫面。"); return; }
  if (!window.google?.accounts?.id) { setTimeout(initGoogle, 400); return; }
  google.accounts.id.initialize({
    client_id: CLIENT_ID, ux_mode: "popup",
    callback: (r) => guard("loginMsg", async () => { state.token = r.credential; await enter(realScheduleApi(base, () => state.token), "已登入："); }),
  });
  google.accounts.id.renderButton($("gbtn"), { theme: "outline", size: "large", locale: "zh-TW", text: "signin_with" });
}
$("demoStaff").onclick = () => guard("loginMsg", () => enter(demoScheduleApi({ staff: true }), "示範："));
$("demoSchool").onclick = () => guard("loginMsg", () => enter(demoScheduleApi({ staff: false }), "示範："));

// ---------- 表單 ----------
for (const [k, v] of Object.entries(SKUS)) $("sku").append(el("option", { value: k, textContent: v.name }));
const typeOf = () => document.querySelector("input[name=type]:checked").value;
function syncType() { $("singleBox").classList.toggle("hidden", typeOf() !== "single"); $("monthlyBox").classList.toggle("hidden", typeOf() !== "monthly"); $("previewCard").classList.add("hidden"); }
document.querySelectorAll("input[name=type]").forEach((r) => (r.onchange = syncType));
// ---------- 每月輪替：選月份（年曆＋快速選）→ 每一批一張卡，日期與時間（到分鐘）都可以自己指定 ----------
const cards = () => [...$("months").children];
const dateIn = (r) => r.querySelector("input[type=date]"), timeIn = (r) => r.querySelector("input[type=time]");
const cardKey = (r) => batchKey(dateIn(r).value, timeIn(r).value);
const monthsData = () => cards().map((r) => ({ month: cardKey(r), list: r.querySelector("textarea").value }));
const MIN_MONTH = () => firstSelectable(twToday());
let calYear = Number(MIN_MONTH().slice(0, 4));
const sortCards = () => cards().sort((a, b) => (cardKey(a) < cardKey(b) ? -1 : 1)).forEach((c) => $("months").append(c));

function refreshMonths() {
  sortCards();
  const data = monthsData(), dupes = findDupes(data), dupEmails = Object.keys(dupes), today = twToday();
  const dayCount = {}; data.forEach((m) => { const d = keyDate(m.month); dayCount[d] = (dayCount[d] || 0) + 1; });
  for (const r of cards()) {
    const key = cardKey(r), d = keyDate(key), mine = parseEmails(r.querySelector("textarea").value), bad = mine.filter((e) => dupes[e]);
    const n = r.querySelector(".badge"); n.textContent = `${mine.length} 位`; n.classList.toggle("zero", mine.length === 0);
    r.querySelector(".mt").textContent = d ? `${dateLabel(key)} 換這批` : "請選日期";
    const notes = [];
    if (!d) notes.push("還沒選日期");
    else if (d < today) notes.push("這個日期已經過了，請改成今天或之後");
    if (d && dayCount[d] > 1) notes.push("同一天只能有一批，請改日期");
    if (bad.length) notes.push(`重複：${bad.slice(0, 3).join("、")}${bad.length > 3 ? ` 等 ${bad.length} 位` : ""} 也排在 ${[...new Set(bad.flatMap((e) => dupes[e]))].filter((m) => m !== key).map(dateLabel).join("、")}，同一人只能排一批`);
    r.classList.toggle("dup", notes.length > 0); r.querySelector(".dupmsg").textContent = notes.join("；");
  }
  $("monthTotal").textContent = data.length ? `已排 ${data.length} 批（${dateLabel(data[0].month)} 到 ${dateLabel(data.at(-1).month)}），共 ${data.reduce((a, m) => a + parseEmails(m.list).length, 0)} 位${dupEmails.length ? `；有 ${dupEmails.length} 位重複，請修正` : ""}` : "還沒選日期，請從上面的年曆點月份，或用「連續幾個月」，每一批再自己改日期和時間。";
  $("monthTotal").style.color = dupEmails.length ? "var(--err)" : "";
  renderCal(); $("previewCard").classList.add("hidden");
}
function addMonthCard(ym, forcedDate) {
  const today = twToday(); let d = forcedDate || dateInMonth(ym, $("mDay").value); if (!forcedDate && d < today) d = today.slice(0, 7) === ym ? today : d;
  const row = el("div", { className: "mo" });
  const dt = el("input", { type: "date", value: d, min: today }); dt.onchange = refreshMonths;
  const tm = el("input", { type: "time", value: $("runTime").value || "03:00", step: "60" }); tm.onchange = refreshMonths;
  const ta = el("textarea", { placeholder: "這一批要有授權的帳號，一行一個（可直接從試算表貼上整欄）" }); ta.style.minHeight = "90px"; ta.oninput = refreshMonths;
  row.append(
    el("div", { className: "mh" }, el("strong", { className: "mt" }), el("span", { className: "badge", textContent: "0 位" }),
      el("button", { className: "ghost mx", type: "button", textContent: "移除這一批", onclick: () => removeCards([row]) })),
    el("div", { className: "mdt" }, el("label", { textContent: "日期" }), dt, el("label", { textContent: "時間（到分鐘）" }), tm),
    ta, el("div", { className: "dupmsg" }));
  $("months").append(row);
}
async function removeCards(rows) {
  const filled = rows.filter((r) => r.querySelector("textarea").value.trim());
  if (filled.length && !(await ask("移除這一批？", `${rows.length > 1 ? "這個月的 " + rows.length + " 批" : "這一批"}已經貼了名單，移除後名單會不見。`, "移除", true))) return;
  rows.forEach((r) => r.remove()); refreshMonths();
}
function renderCal() {
  const have = new Set(cards().map((r) => keyDate(cardKey(r)).slice(0, 7))), min = MIN_MONTH();
  $("yLabel").textContent = `${calYear} 年`; $("yPrev").disabled = `${calYear - 1}-12` < min;
  $("mGrid").textContent = "";
  for (let m = 1; m <= 12; m++) {
    const ym = `${calYear}-${String(m).padStart(2, "0")}`;
    const b = el("button", { type: "button", textContent: `${m} 月`, disabled: ym < min, className: have.has(ym) ? "on" : "" });
    b.onclick = () => { if (have.has(ym)) removeCards(cards().filter((r) => keyDate(cardKey(r)).slice(0, 7) === ym)); else { addMonthCard(ym); refreshMonths(); } };
    $("mGrid").append(b);
  }
}
$("yPrev").onclick = () => { calYear--; renderCal(); }; $("yNext").onclick = () => { calYear++; renderCal(); };
for (let i = 0; i < 24; i++) { const ym = addMonths(MIN_MONTH(), i); $("mFrom").append(el("option", { value: ym, textContent: monthLabel(ym) })); }
for (let n = 1; n <= 12; n++) $("mCount").append(el("option", { value: String(n), textContent: String(n), selected: n === 3 }));
for (let d = 1; d <= 31; d++) $("mDay").append(el("option", { value: String(d), textContent: `${d} 號` }));
function applyRange(count) { for (const ym of monthRange($("mFrom").value, count)) { if (!cards().some((r) => keyDate(cardKey(r)).slice(0, 7) === ym)) addMonthCard(ym); } calYear = Number($("mFrom").value.slice(0, 4)); refreshMonths(); }
$("mApply").onclick = () => applyRange(Number($("mCount").value));
document.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { $("mCount").value = b.dataset.q; applyRange(Number(b.dataset.q)); }));
const nextDay = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
$("mAddOne").onclick = () => { const ds = cards().map((r) => keyDate(cardKey(r))).filter(Boolean).sort(); const d = ds.length ? nextDay(ds.at(-1)) : twToday(); addMonthCard(d.slice(0, 7), d); refreshMonths(); };
$("mClear").onclick = async () => { if (!cards().length || !(await ask("清空全部批次？", "所有批次和已貼的名單都會不見。", "清空", true))) return; $("months").textContent = ""; refreshMonths(); };
refreshMonths();
const readForm = () => buildBody({
  domain: $("domain").value, sku: $("sku").value, type: typeOf(), runDate: $("runDate").value, runTime: $("runTime").value, add: $("add").value, revoke: $("revoke").value, keep: $("keep").value,
  months: monthsData(),
});

const OP = { add: "指派", remove: "收回", skip: "跳過", error: "出錯" };
function renderPreview(r, body) {
  $("previewCard").classList.remove("hidden");
  $("previewHint").textContent = `以 ${r.runDate} 這一天的規則預演（每月輪替只預演最早那一批）。系統當下讀到學校的實際狀況。`;
  const c = r.counts; $("sum").textContent = "";
  for (const [k, cls] of [["remove", "s-remove"], ["add", "s-add"], ["skip", "s-skip"], ["error", "s-error"]]) $("sum").append(el("div", { className: cls, textContent: `${OP[k]} ${c[k]}` }));
  const ms = body.type === "monthly" ? monthlySummary(body.months ? Object.entries(body.months).map(([month, l]) => ({ month, list: l.join("\n") })) : []) : [];
  $("monthSumBox").classList.toggle("hidden", !ms.length); $("monthSumRows").textContent = "";
  for (const m of ms) { const tr = $("monthSumRows").insertRow(); tr.insertCell().textContent = dateLabel(m.month); tr.insertCell().textContent = `${m.add} 位`; tr.insertCell().textContent = m.remove ? `${m.remove} 位` : "沒有（第一批）"; if (m.empty) tr.style.background = "#fef3c7"; }
  const tb = $("planRows"); tb.textContent = "";
  for (const a of r.actions) {
    const tr = tb.insertRow(); tr.className = `r-${a.op}`;
    tr.insertCell().append(el("span", { className: `pill p-${a.op}`, textContent: OP[a.op] })); tr.insertCell().textContent = a.email; tr.insertCell().textContent = a.reason;
  }
  const problems = [...(r.reasons || []), ...(r.warnings || []), ...(r.conflicts?.blocked || [])];
  if (problems.length) msg("previewMsg", "err", problems.join("；"));
  else msg("previewMsg", r.conflicts?.notes?.length ? "warn" : "ok", r.conflicts?.notes?.length ? "預演沒問題，但有重複提醒：" + r.conflicts.notes.join("；") : "預演沒有問題。");
  $("btnCreate").disabled = problems.length > 0;
  state.lastBody = body;
}
$("btnPreview").onclick = () => guard("formMsg", async () => {
  msg("formMsg", "", ""); const body = readForm();
  msg("formMsg", "info", "正在讀學校現況並預演…");
  const r = await state.api.preview(body); msg("formMsg", "", ""); renderPreview(r, body);
});
$("btnCreate").onclick = () => guard("previewMsg", async () => {
  const b = state.lastBody; if (!b) return;
  const who = state.me.staff ? "會直接生效，" : "要等鴻綸核准才會生效，";
  if (!(await ask("確定建立排程嗎？", `學校 ${b.domain}。${who}而且一開始只預演，不會寫入。`, "建立排程"))) return;
  const r = await state.api.create(b);
  msg("previewMsg", "ok", `已建立排程 #${r.id}（${STATUS_LABEL[r.status]}）`); $("btnCreate").disabled = true; await refresh();
});

// ---------- 排程列表 ----------
async function act(label, fn, confirm) {
  if (confirm && !(await ask(confirm.title, confirm.body, confirm.yes, !!confirm.danger))) return;
  await guard("listMsg", async () => { msg("listMsg", "info", `${label}中…`); const r = await fn(); msg("listMsg", "ok", `${label}完成${r?.message ? "：" + r.message : ""}`); await refresh(true); });
}
function renderRows(list) {
  const tb = $("rows"); tb.textContent = "";
  if (!list.length) { const td = tb.insertRow().insertCell(); td.colSpan = 7; td.textContent = "還沒有排程"; return; }
  const today = twToday();
  for (const s of list) {
    const tr = tb.insertRow(); const a = allowedActions(state.me, s);
    tr.insertCell().textContent = s.id;
    const c1 = tr.insertCell(); c1.append(el("div", { textContent: s.domain }), el("small", { textContent: SKUS[s.sku]?.short || s.sku }));
    tr.insertCell().textContent = TYPE_LABEL[s.type] || s.type;
    tr.insertCell().textContent = describeNext(s, today) || "—";
    const cs = tr.insertCell(); cs.append(el("span", { className: `tag ${s.status === "active" ? "live" : s.status === "needs_attention" || s.status === "overdue" ? "stop" : s.status === "pending_approval" ? "warn" : ""}`, textContent: STATUS_LABEL[s.status] || s.status }), el("br"), el("small", { textContent: s.dryRunOnly ? "只預演" : "正式執行" }));
    tr.insertCell().textContent = describeRun(s.runs?.[0]);
    const box = el("div", { className: "row" });
    const btn = (text, fn, cls = "ghost") => box.append(el("button", { className: cls, textContent: text, onclick: fn }));
    if (a.approve) btn("核准", () => act("核准", () => state.api.approve(s.id), { title: "核准這筆排程？", body: `${s.domain} 的排程 #${s.id} 會開始生效（仍是只預演）。系統會先重新預演一次，沒過就不能核准。`, yes: "核准" }), "");
    if (a.test) btn("手動測試", () => act("手動測試", () => state.api.testRun(s.id)));
    if (a.toggleReal) btn(s.dryRunOnly ? "改正式執行" : "改回只預演", () => act("切換", () => state.api.setReal(s.id, s.dryRunOnly), s.dryRunOnly ? { title: "改成正式執行？", body: "到期時會真的收回與指派授權，改到學校後台。確定手動測試的結果正確再改。", yes: "改成正式執行", danger: true } : null), s.dryRunOnly ? "danger" : "ghost");
    if (a.pause) btn("暫停", () => act("暫停", () => state.api.pause(s.id)));
    if (a.resume) btn("恢復", () => act("恢復", () => state.api.resume(s.id)));
    if (a.del) btn("刪除", () => act("刪除", () => state.api.remove(s.id), { title: "刪除這筆排程？", body: "排程與它的執行紀錄都會刪掉，無法復原。", yes: "刪除", danger: true }), "ghost");
    tr.insertCell().append(box);
  }
}
async function refresh(keep = false) { await guard("listMsg", async () => { const r = await state.api.list(); renderRows(r.schedules); if (!keep) msg("listMsg", "", ""); }); }
$("btnRefresh").onclick = () => refresh();

// ---------- 鴻綸管理 ----------
$("btnSchool").onclick = () => guard("staffMsg", async () => {
  const d = $("sDomain").value.trim().toLowerCase(), m = $("sAdmin").value.trim().toLowerCase();
  msg("staffMsg", "info", "正在測試能不能扮演該校管理員…");
  await state.api.addSchool(d, m); msg("staffMsg", "ok", `已登記 ${d}`);
});
$("btnPause").onclick = () => guard("staffMsg", async () => {
  const to = !state.me.paused;
  if (to && !(await ask("全域暫停？", "暫停後，所有排程到期都不會執行，直到解除。", "全域暫停", true))) return;
  const r = await state.api.setGlobalPause(to); state.me.paused = r.paused;
  $("btnPause").textContent = r.paused ? "解除全域暫停" : "全域暫停所有排程"; msg("staffMsg", "ok", r.paused ? "已全域暫停" : "已解除全域暫停");
});

initGoogle();
