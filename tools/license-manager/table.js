// 通用的可編輯表格（像 Excel）＋匯入設定視窗。欄位由 fields 決定，批次新增帳號、批次轉移 OU 共用。
import { detectTable } from "./logic.js?v=20261123b";
import { guessColumns } from "./accounts_logic.js?v=20261123b";
import { openFile, googleSheetSource, demoSheetSource, pickBestTab } from "./sheet.js?v=20261123b";

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); kids.forEach((k) => e.append(k)); return e; };
const cell = (v) => (v == null ? "" : String(v).trim());

// 一個 <dialog>，內容由 build(dlg) 填；回傳 dlg
function makeDialog(wide = true) { const d = el("dialog", { className: wide ? "wide" : "" }); document.body.append(d); return d; }

export function createTable({ root, fields, importFields = fields, ouListId, notify, getSheetsToken, isDemo, askConfirm, rowLimit = 1000 }) {
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]));
  let rows = [blank()];
  const isEmpty = (r) => fields.every((f) => !String(r[f.key] ?? "").trim() || f.default === r[f.key]);
  const trim = () => { while (rows.length > 1 && isEmpty(rows[rows.length - 1]) && isEmpty(rows[rows.length - 2])) rows.pop(); if (!isEmpty(rows[rows.length - 1])) rows.push(blank()); };

  root.innerHTML = "";
  const toolbar = el("div", { className: "toolbar" });
  const mk = (txt, fn) => { const b = el("button", { className: "ghost", type: "button", textContent: txt }); b.onclick = fn; toolbar.append(b); return b; };
  const fileIn = el("input", { type: "file", accept: ".csv,.tsv,.txt,.xlsx,.xls", hidden: true });
  mk("上傳檔案（CSV、Excel）", () => fileIn.click());
  mk("匯入 Google 試算表", () => openSheetDialog());
  mk("貼上多筆", () => openPasteDialog());
  mk("＋ 新增一列", () => { rows.push(blank()); render(); body.rows[rows.length - 1]?.querySelector("input")?.focus(); });
  mk("清空", async () => { if (rows.every(isEmpty)) return; if (await askConfirm("清空表格？", "目前表格裡的所有列都會被移除（還沒有改到 Google 後台）。", "清空", true)) { rows = [blank()]; render(); } });
  const sum = el("div", { className: "chips" });
  const table = el("table", { className: "grid" });
  table.append(el("thead", {}, el("tr", {}, el("th", { className: "idx", textContent: "#" }), ...fields.map((f) => el("th", { textContent: f.label, style: f.width ? `width:${f.width}px` : "" })), el("th", { className: "act" }))));
  const body = el("tbody"); table.append(body);
  const box = el("div", { className: "gridbox" }, table);
  root.append(toolbar, fileIn, sum, box);

  function updateSum() { sum.textContent = ""; const n = rows.filter((r) => !isEmpty(r)).length; sum.append(el("span", { className: "chip", textContent: `共 ${n} 列` })); if (n > rowLimit) sum.append(el("span", { className: "chip bad", textContent: `超過 ${rowLimit} 列，請分批` })); }

  function makeRow(r, i) {
    const tr = el("tr", {}, el("td", { className: "idx", textContent: String(i + 1) }));
    fields.forEach((f, fi) => {
      let inp;
      if (f.type === "bool") { inp = el("input", { type: "checkbox", checked: !!r[f.key], ariaLabel: f.label }); inp.onchange = () => { r[f.key] = inp.checked; }; tr.append(el("td", { style: "text-align:center" }, inp)); return; }
      inp = el("input", { type: "text", value: r[f.key] ?? "", placeholder: i === 0 ? f.placeholder || "" : "", autocomplete: "off", spellcheck: false, ariaLabel: `第 ${i + 1} 列${f.label}` });
      if (f.type === "ou" && ouListId) inp.setAttribute("list", ouListId);
      inp.addEventListener("input", () => { r[f.key] = inp.value; if (r === rows[rows.length - 1] && !isEmpty(r)) { rows.push(blank()); body.append(makeRow(rows[rows.length - 1], rows.length - 1)); } updateSum(); });
      inp.addEventListener("paste", (ev) => {
        const text = ev.clipboardData?.getData("text") || "";
        if (!/[\r\n\t]/.test(text.trim())) return; // 單一格照一般貼上
        ev.preventDefault();
        const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
        const cols = fields.filter((x) => x.type !== "bool");
        const start = cols.findIndex((x) => x.key === f.key);
        const items = lines.map((ln) => { const o = blank(); ln.split("\t").forEach((v, k) => { const c = cols[start + k]; if (c) o[c.key] = cell(v); }); return o; });
        if (isEmpty(r)) rows.splice(i, 1, ...items); else rows.splice(i + 1, 0, ...items);
        trim(); render(); notify("info", `已貼上 ${items.length} 列。`);
      });
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); body.rows[i + 1]?.cells[fi + 1]?.querySelector("input")?.focus(); } });
      tr.append(el("td", {}, inp));
    });
    const del = el("button", { className: "x", type: "button", title: "刪除這一列", ariaLabel: `刪除第 ${i + 1} 列`, textContent: "×" });
    del.onclick = () => { rows.splice(i, 1); trim(); render(); };
    tr.append(el("td", { className: "act" }, del));
    return tr;
  }
  function render() { body.textContent = ""; rows.forEach((r, i) => body.append(makeRow(r, i))); updateSum(); }

  // ---- 匯入設定視窗：每個欄位挑來源欄，預覽前幾列 ----
  async function openImport(src) {
    const dlg = makeDialog(); const state = {};
    const tabSel = el("select"), info = el("div", { className: "msg info" }), prev = el("tbody"), mode = el("select");
    mode.add(new Option("加到目前表格", "append")); mode.add(new Option("取代整張表格", "replace"));
    const selects = Object.fromEntries(importFields.map((f) => [f.key, el("select")]));
    const yes = el("button", { textContent: "匯入" }), no = el("button", { className: "ghost", textContent: "取消" });
    const row = (label, ctl) => el("div", { className: "f" }, el("label", { textContent: label }), ctl);
    dlg.append(el("h3", { textContent: `匯入：${src.label}` }), info, src.tabs.length > 1 ? row("分頁", tabSel) : "",
      ...importFields.map((f) => row(f.label, selects[f.key])), row("匯入方式", mode),
      row("預覽（前 6 列）", el("div", { className: "box", style: "max-height:190px" }, el("table", {}, prev))),
      el("div", { className: "row", style: "justify-content:flex-end" }, no, yes));
    const mapped = () => {
      const t = state.table; if (!t?.ok) return [];
      const idx = Object.fromEntries(importFields.map((f) => [f.key, Number(selects[f.key].value)]));
      return t.rows.slice(t.dataStart).map((r) => Object.fromEntries(importFields.map((f) => [f.key, idx[f.key] >= 0 ? cell(r[idx[f.key]]) : ""]))).filter((o) => Object.values(o).some((v) => v));
    };
    const refresh = () => {
      const t = state.table; prev.textContent = "";
      if (!t?.ok) { info.className = "msg warn"; info.textContent = "這一頁找不到任何電子郵件。若有多個分頁，請換一個分頁看看。"; yes.disabled = true; return; }
      const data = mapped(); state.data = data;
      info.className = "msg ok"; info.textContent = `辨識到 ${data.length} 列。確認每個欄位對到哪一欄，沒問題就按「匯入」。`;
      data.slice(0, 6).forEach((o) => { const tr = prev.insertRow(); importFields.forEach((f) => { tr.insertCell().textContent = f.type === "password" ? (o[f.key] ? "••••" : "") : o[f.key]; }); });
      yes.disabled = !data.length;
    };
    const load = async (tab) => {
      try { state.table = detectTable(await src.load(tab)); } catch (e) { return notify("err", "讀取分頁失敗：" + e.message); }
      if (state.table.ok) {
        const h = state.table.headers, guess = guessColumns(importFields, h);
        guess.email = state.table.emailCol; // 信箱欄用內容判斷，比標題可靠
        for (const f of importFields) { const s = selects[f.key]; s.textContent = ""; s.add(new Option("（不匯入）", "-1")); h.forEach((x, i) => s.add(new Option(`${String.fromCharCode(65 + (i % 26))}：${x}`, String(i)))); s.value = String(guess[f.key] ?? -1); s.onchange = refresh; }
      }
      refresh();
    };
    src.tabs.forEach((t) => tabSel.add(new Option(t, t))); const first = await pickBestTab(src); tabSel.value = first; tabSel.onchange = () => load(tabSel.value);
    no.onclick = () => { dlg.close(); dlg.remove(); };
    yes.onclick = () => {
      const data = state.data.map((o) => ({ ...blank(), ...o }));
      if (mode.value === "replace") rows = data; else rows = rows.filter((r) => !isEmpty(r)).concat(data);
      trim(); render(); dlg.close(); dlg.remove();
      notify("ok", `已匯入 ${data.length} 列。請確認表格內容後按「預演」。`);
    };
    await load(first); dlg.showModal();
  }
  async function fromFile(f) { try { await openImport(await openFile(f)); } catch (e) { notify("err", e.message); } }
  fileIn.onchange = () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) fromFile(f); };
  ["dragenter", "dragover"].forEach((t) => box.addEventListener(t, (e) => { e.preventDefault(); box.classList.add("drop"); }));
  ["dragleave", "drop"].forEach((t) => box.addEventListener(t, (e) => { e.preventDefault(); box.classList.remove("drop"); }));
  box.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; if (f) fromFile(f); });

  function openSheetDialog() {
    const dlg = makeDialog(false), url = el("input", { type: "text", placeholder: "https://docs.google.com/spreadsheets/d/…" }), msg = el("div");
    const yes = el("button", { textContent: "讀取" }), no = el("button", { className: "ghost", textContent: "取消" });
    dlg.append(el("h3", { textContent: "匯入 Google 試算表" }), el("p", { className: "hint", textContent: "貼上試算表網址。系統會暫時請求「讀取試算表」的唯讀權限，只讀這一份，不會修改。" }), url, msg, el("div", { className: "row", style: "justify-content:flex-end" }, no, yes));
    no.onclick = () => { dlg.close(); dlg.remove(); };
    yes.onclick = async () => {
      yes.disabled = true; msg.className = "msg info"; msg.textContent = "讀取中…（第一次會跳出 Google 視窗，請允許「讀取試算表」）";
      try { const src = isDemo() ? demoSheetSource() : await googleSheetSource(url.value.trim(), getSheetsToken); dlg.close(); dlg.remove(); await openImport(src); }
      catch (e) { msg.className = "msg err"; msg.textContent = e.message; } finally { yes.disabled = false; }
    };
    dlg.showModal();
  }
  function openPasteDialog() {
    const dlg = makeDialog(false), ta = el("textarea", { placeholder: "從 Excel 複製多列，欄位順序：" + fields.filter((f) => f.type !== "bool").map((f) => f.label).join("、") });
    const yes = el("button", { textContent: "加入表格" }), no = el("button", { className: "ghost", textContent: "取消" });
    dlg.append(el("h3", { textContent: "貼上多筆" }), el("p", { className: "hint", textContent: "欄位用 Tab（從 Excel 複製就是）或逗號分隔，一行一列。" }), ta, el("div", { className: "row", style: "justify-content:flex-end" }, no, yes));
    no.onclick = () => { dlg.close(); dlg.remove(); };
    yes.onclick = () => {
      const cols = fields.filter((f) => f.type !== "bool");
      const items = ta.value.replace(/\r/g, "").split("\n").filter((l) => l.trim()).map((ln) => { const o = blank(); ln.split(/\t|,/).forEach((v, k) => { if (cols[k]) o[cols[k].key] = cell(v); }); return o; });
      dlg.close(); dlg.remove(); if (!items.length) return notify("warn", "沒有找到內容。");
      rows = rows.filter((r) => !isEmpty(r)).concat(items); trim(); render(); notify("ok", `已加入 ${items.length} 列。`);
    };
    dlg.showModal(); ta.focus();
  }

  render();
  return { getRows: () => rows.filter((r) => !isEmpty(r)).map((r) => ({ ...r })), setRows: (items) => { rows = items.map((x) => ({ ...blank(), ...x })); trim(); render(); }, clear: () => { rows = [blank()]; render(); }, render };
}
