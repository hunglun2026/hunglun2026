// 讀「來源」：CSV、Excel（.xlsx）、Google 試算表，統一轉成二維陣列交給 logic.js 辨識。
// 來源物件：{ label, tabs: [分頁名], preferTab, load(tab) -> rows2d }
import { parseCsv, decodeText, detectTable, sheetIdFromUrl } from "./logic.js?v=20261123a";

const XLSX_LIB = "https://cdn.jsdelivr.net/npm/read-excel-file@5.8.5/bundle/read-excel-file.min.js";
let libPromise = null;
function loadXlsxLib() {
  if (window.readXlsxFile) return Promise.resolve(window.readXlsxFile);
  return (libPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = XLSX_LIB;
    s.onload = () => (window.readXlsxFile ? resolve(window.readXlsxFile) : reject(new Error("Excel 讀取元件載入失敗")));
    s.onerror = () => { libPromise = null; reject(new Error("無法載入 Excel 讀取元件，請檢查網路，或先另存成 CSV 再上傳")); };
    document.head.appendChild(s);
  }));
}

export async function openFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (["csv", "tsv", "txt"].includes(ext)) {
    const rows = parseCsv(decodeText(new Uint8Array(await file.arrayBuffer())));
    return { label: file.name, tabs: [], load: async () => rows };
  }
  if (ext === "xlsx") {
    const read = await loadXlsxLib();
    const sheets = await read(file, { getSheets: true });
    return { label: file.name, tabs: sheets.map((s) => s.name), load: (tab) => read(file, { sheet: tab }) };
  }
  if (ext === "xls") throw new Error("舊版 .xls 格式不支援，請在 Excel 另存為「.xlsx」或「CSV」後再上傳");
  throw new Error("不支援的檔案格式，請上傳 CSV 或 Excel（.xlsx）");
}

// 多個分頁時，挑「信箱最多」的那一頁
export async function pickBestTab(src) {
  if (src.preferTab) return src.preferTab;
  if (src.tabs.length <= 1) return src.tabs[0] || "";
  let best = src.tabs[0], bestN = -1;
  for (const tab of src.tabs.slice(0, 12)) {
    try { const t = detectTable(await src.load(tab)); const n = t.ok ? t.emailTotal : 0; if (n > bestN) { best = tab; bestN = n; } } catch { /* 這頁讀不了就換下一頁 */ }
  }
  return best;
}

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
async function sheetsFetch(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) return res.json();
  let msg = res.statusText; try { msg = (await res.json()).error.message; } catch { /* 沒有 JSON 就用狀態文字 */ }
  if (res.status === 404) throw new Error("找不到這份試算表，或你登入的帳號沒有開啟它的權限");
  if (res.status === 403 && /has not been used|disabled|SERVICE_DISABLED/i.test(msg)) throw new Error("這個系統的 Google Sheets 服務尚未啟用，請聯絡鴻綸科技");
  if (res.status === 403) throw new Error("你登入的帳號沒有這份試算表的檢視權限");
  if (res.status === 401) throw new Error("登入已過期，請重新整理頁面後再登入");
  throw new Error(msg);
}

export async function googleSheetSource(url, getToken) {
  const ref = sheetIdFromUrl(url);
  if (!ref) throw new Error("看不出這是 Google 試算表的網址，請貼上完整網址（docs.google.com/spreadsheets/d/…）");
  const token = await getToken();
  const meta = await sheetsFetch(token, `${SHEETS}/${ref.id}?fields=properties.title,sheets.properties(sheetId,title)`);
  const tabs = (meta.sheets || []).map((s) => s.properties.title);
  const gidTab = (meta.sheets || []).find((s) => String(s.properties.sheetId) === ref.gid)?.properties.title;
  const range = (tab) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'`);
  return { label: meta.properties.title, tabs, preferTab: gidTab || "", load: async (tab) => (await sheetsFetch(token, `${SHEETS}/${ref.id}/values/${range(tab)}`)).values || [] };
}

// 示範模式用：不連 Google，給一份假的試算表
export function demoSheetSource() {
  const rows = [["姓名", "信箱", "動作"], ["甲老師", "d@demo.school.tw", "指派"], ["乙老師", "e@demo.school.tw", "指派"], ["丙老師", "a@demo.school.tw", "收回"], ["丁老師", "keep@demo.school.tw", "保留"]];
  return { label: "示範用試算表", tabs: ["名單"], preferTab: "名單", load: async () => rows };
}
