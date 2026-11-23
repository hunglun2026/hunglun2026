// 步驟 2 的名單表格（像 Excel 一格一格）與匯入（上傳檔案、Google 試算表、貼上多筆）。
// 純邏輯在 logic.js，讀檔在 sheet.js，這裡只管畫面。
import { ACTION_LABEL, MAX_CHANGES, normalizeAction, cleanEmail, listsFromRows, parsePasted, detectTable, rowsFromTable } from "./logic.js?v=20261123c";
import { openFile, googleSheetSource, demoSheetSource, pickBestTab } from "./sheet.js?v=20261123c";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); kids.forEach((k) => e.append(k)); return e; };
const blank = () => ({ email: "", action: "add" });

export function createGrid({ notify, askConfirm, getSheetsToken, isDemo }) {
  let rows = [blank()];
  const body = $("gBody");

  function trimBlanks() { while (rows.length > 1 && !rows[rows.length - 1].email.trim() && !rows[rows.length - 2].email.trim()) rows.pop(); if (!rows.length || rows[rows.length - 1].email.trim()) rows.push(blank()); }

  function updateSum() {
    const l = listsFromRows(rows), n = l.add.length + l.revoke.length;
    const parts = [["add", `指派 ${l.add.length}`], ["revoke", `收回 ${l.revoke.length}`], ["keep", `保留不動 ${l.keep.length}`]];
    $("gSum").innerHTML = "";
    parts.forEach(([k, p]) => $("gSum").append(el("span", { className: `chip c-${k}`, textContent: p })));
    if (l.invalid) $("gSum").append(el("span", { className: "chip bad", textContent: `格式錯誤 ${l.invalid}` }));
    if (n > MAX_CHANGES) $("gSum").append(el("span", { className: "chip bad", textContent: `要異動 ${n} 位，單次上限 ${MAX_CHANGES}，請分批` }));
  }

  function makeRow(r, i) {
    const tr = el("tr");
    tr.append(el("td", { className: "idx", textContent: String(i + 1) }));
    const inp = el("input", { type: "text", value: r.email, placeholder: i === 0 ? "teacher@school.edu.tw" : "", autocomplete: "off", spellcheck: false, ariaLabel: `第 ${i + 1} 列電子郵件` });
    const mark = () => inp.classList.toggle("bad", !!inp.value.trim() && !cleanEmail(inp.value));
    mark();
    inp.addEventListener("input", () => {
      r.email = inp.value; mark();
      if (r === rows[rows.length - 1] && inp.value.trim()) { rows.push(blank()); body.append(makeRow(rows[rows.length - 1], rows.length - 1)); }
      updateSum();
    });
    inp.addEventListener("paste", (ev) => {
      const text = ev.clipboardData?.getData("text") || "";
      if (!/[\r\n\t]/.test(text.trim())) return; // 單一信箱照一般貼上
      ev.preventDefault();
      const items = parsePasted(text, r.action);
      if (!items.length) return notify("warn", "貼上的內容裡找不到電子郵件。");
      if (!r.email.trim()) rows.splice(i, 1, ...items); else rows.splice(i + 1, 0, ...items);
      trimBlanks(); render(); notify("info", `已貼上 ${items.length} 筆。`);
    });
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); body.rows[i + 1]?.querySelector("input")?.focus(); } });
    const sel = el("select", { ariaLabel: `第 ${i + 1} 列動作` });
    for (const [k, v] of Object.entries(ACTION_LABEL)) sel.add(new Option(v, k));
    const tint = () => { sel.className = `a-${sel.value}`; };
    sel.value = r.action; tint(); sel.addEventListener("change", () => { r.action = sel.value; tint(); updateSum(); });
    const del = el("button", { className: "x", type: "button", title: "刪除這一列", ariaLabel: `刪除第 ${i + 1} 列`, textContent: "×" });
    del.addEventListener("click", () => { rows.splice(i, 1); trimBlanks(); render(); });
    tr.append(el("td", {}, inp), el("td", {}, sel), el("td", { className: "act" }, del));
    return tr;
  }

  function render() { body.textContent = ""; rows.forEach((r, i) => body.append(makeRow(r, i))); updateSum(); }

  // 合併匯入的列：已存在的信箱更新動作，新的接在後面；mode=replace 則整張換掉
  function addRows(items, mode = "append") {
    let added = 0, updated = 0;
    if (mode === "replace") { rows = items.map((x) => ({ ...x })); added = items.length; }
    else {
      const idx = new Map(rows.map((r, i) => [cleanEmail(r.email), i]).filter(([e]) => e));
      rows = rows.filter((r) => r.email.trim());
      rows.forEach((r, i) => idx.set(cleanEmail(r.email), i));
      for (const it of items) { const at = idx.get(it.email); if (at !== undefined) { rows[at].action = it.action; updated++; } else { idx.set(it.email, rows.length); rows.push({ ...it }); added++; } }
    }
    trimBlanks(); render();
    return { added, updated };
  }

  // ---------- 匯入設定視窗 ----------
  const imp = { src: null, table: null };
  const optionList = (select, headers, withNone) => {
    select.textContent = "";
    if (withNone) select.add(new Option("沒有（統一用下方的動作）", "-1"));
    headers.forEach((h, i) => select.add(new Option(`${String.fromCharCode(65 + (i % 26))}：${h}`, String(i))));
  };
  // 動作欄每一格都看得懂時，就不需要「預設動作」
  const actionColAllRecognized = (t, col) => t.rows.slice(t.dataStart).every((r) => !(r[col] || "").trim() || normalizeAction(r[col]));
  function refreshImport() {
    const t = imp.table, okBtn = $("impYes");
    if (!t.ok) {
      $("impInfo").className = "msg warn"; $("impInfo").textContent = "這一頁找不到任何電子郵件。若有多個分頁，請換一個分頁看看。";
      $("impPrev").textContent = ""; okBtn.disabled = true; return;
    }
    const emailCol = Number($("impEmail").value), actionCol = Number($("impAction").value), def = $("impDefault").value;
    const r = rowsFromTable(t, { emailCol, actionCol, defaultAction: def });
    const by = { add: 0, revoke: 0, keep: 0 }; r.rows.forEach((x) => by[x.action]++);
    const notes = [`辨識到 ${r.rows.length} 位：指派 ${by.add}、收回 ${by.revoke}、保留不動 ${by.keep}`];
    if (r.dups) notes.push(`重複的信箱 ${r.dups} 筆已合併`);
    if (r.skipped) notes.push(`不是電子郵件的格子 ${r.skipped} 筆已略過`);
    if (r.unknownAction) notes.push(`動作看不懂的 ${r.unknownAction} 筆改用預設動作`);
    $("impInfo").className = "msg ok"; $("impInfo").textContent = notes.join("；") + "。";
    $("impDefaultRow").classList.toggle("hidden", actionCol >= 0 && r.unknownAction === 0 && actionColAllRecognized(t, actionCol));
    const tb = $("impPrev"); tb.textContent = "";
    r.rows.slice(0, 6).forEach((x) => { const tr = tb.insertRow(); tr.insertCell().textContent = x.email; tr.insertCell().textContent = ACTION_LABEL[x.action]; });
    if (r.rows.length > 6) { const tr = tb.insertRow(); const c = tr.insertCell(); c.colSpan = 2; c.textContent = `…還有 ${r.rows.length - 6} 位`; }
    imp.result = r; okBtn.disabled = !r.rows.length;
  }
  async function loadTab(tab) {
    try { imp.table = detectTable(await imp.src.load(tab)); } catch (e) { return notify("err", "讀取分頁失敗：" + e.message); }
    if (imp.table.ok) {
      optionList($("impEmail"), imp.table.headers, false); optionList($("impAction"), imp.table.headers, true);
      $("impEmail").value = String(imp.table.emailCol); $("impAction").value = String(imp.table.actionCol);
    }
    refreshImport();
  }
  async function openImport(src) {
    imp.src = src;
    $("impTitle").textContent = `匯入：${src.label}`;
    const tabSel = $("impTab"); tabSel.textContent = "";
    src.tabs.forEach((t) => tabSel.add(new Option(t, t)));
    $("impTabRow").classList.toggle("hidden", src.tabs.length <= 1);
    const tab = await pickBestTab(src); tabSel.value = tab;
    $("impDefault").value = "add"; $("impMode").value = "append";
    await loadTab(tab);
    $("impDlg").showModal();
  }
  $("impTab").onchange = () => loadTab($("impTab").value);
  ["impEmail", "impAction", "impDefault"].forEach((id) => { $(id).onchange = refreshImport; });
  $("impNo").onclick = () => $("impDlg").close();
  $("impYes").onclick = () => {
    const { added, updated } = addRows(imp.result.rows, $("impMode").value);
    $("impDlg").close();
    notify("ok", `已匯入：新增 ${added} 列${updated ? `、更新 ${updated} 列的動作` : ""}。請確認表格內容後按「下一步：預演」。`);
  };

  async function fromFile(file) {
    try { await openImport(await openFile(file)); } catch (e) { notify("err", e.message); }
  }
  $("gFile").onclick = () => $("fileIn").click();
  $("fileIn").onchange = () => { const f = $("fileIn").files[0]; $("fileIn").value = ""; if (f) fromFile(f); };
  const box = $("gridBox");
  ["dragenter", "dragover"].forEach((t) => box.addEventListener(t, (e) => { e.preventDefault(); box.classList.add("drop"); }));
  ["dragleave", "drop"].forEach((t) => box.addEventListener(t, (e) => { e.preventDefault(); box.classList.remove("drop"); }));
  box.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; if (f) fromFile(f); });

  // ---------- Google 試算表 ----------
  $("gSheet").onclick = () => { $("sheetUrl").value = ""; $("sheetMsg").textContent = ""; $("sheetDlg").showModal(); };
  $("sheetNo").onclick = () => $("sheetDlg").close();
  $("sheetYes").onclick = async () => {
    const btn = $("sheetYes"); btn.disabled = true; $("sheetMsg").className = "msg info"; $("sheetMsg").textContent = "讀取中…（第一次會跳出 Google 視窗，請允許「讀取試算表」）";
    try {
      const src = isDemo() ? demoSheetSource() : await googleSheetSource($("sheetUrl").value.trim(), getSheetsToken);
      $("sheetDlg").close(); await openImport(src);
    } catch (e) { $("sheetMsg").className = "msg err"; $("sheetMsg").textContent = e.message; }
    finally { btn.disabled = false; }
  };

  // ---------- 貼上多筆、新增、清空 ----------
  $("gPaste").onclick = () => { $("pasteText").value = ""; $("pasteAct").value = "add"; $("pasteDlg").showModal(); $("pasteText").focus(); };
  $("pasteNo").onclick = () => $("pasteDlg").close();
  $("pasteYes").onclick = () => {
    const items = parsePasted($("pasteText").value, $("pasteAct").value);
    $("pasteDlg").close();
    if (!items.length) return notify("warn", "沒有找到電子郵件。");
    const { added, updated } = addRows(items); notify("ok", `已加入 ${added} 列${updated ? `、更新 ${updated} 列` : ""}。`);
  };
  $("gAdd").onclick = () => { rows.push(blank()); render(); body.rows[rows.length - 1].querySelector("input").focus(); };
  $("gClear").onclick = async () => {
    if (!rows.some((r) => r.email.trim())) return;
    if (await askConfirm("清空表格？", "目前表格裡的所有列都會被移除（還沒有改到 Google 後台）。", "清空", true)) { rows = [blank()]; render(); }
  };

  render();
  return { getLists: () => listsFromRows(rows), setRows: (items) => { rows = items.map((x) => ({ ...x })); trimBlanks(); render(); }, clear: () => { rows = [blank()]; render(); }, count: () => rows.filter((r) => r.email.trim()).length };
}
