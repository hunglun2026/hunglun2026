// 匯出 .xlsx（Steve 規定匯出一律 xlsx，中文 CSV 在 Excel 會亂碼）。函式庫只在按下載時才載入。
const LIB = "https://cdn.jsdelivr.net/npm/write-excel-file@1.4.30/bundle/write-excel-file.min.js";
let libPromise = null;
function loadLib() {
  if (window.writeXlsxFile) return Promise.resolve(window.writeXlsxFile);
  return (libPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script"); s.src = LIB;
    s.onload = () => (window.writeXlsxFile ? resolve(window.writeXlsxFile) : reject(new Error("Excel 匯出元件載入失敗")));
    s.onerror = () => { libPromise = null; reject(new Error("無法載入 Excel 匯出元件，請檢查網路後再試")); };
    document.head.append(s);
  }));
}

// head: 標題列文字陣列；rows: 二維陣列（全部當文字，避免密碼或帳號被 Excel 轉成數字）；widths: 每欄寬度
export async function downloadXlsx(fileName, head, rows, widths = []) {
  const write = await loadLib();
  const data = [head.map((v) => ({ value: v, type: String, fontWeight: "bold", backgroundColor: "#e2e8f0" })), ...rows.map((r) => r.map((v) => ({ value: String(v ?? ""), type: String })))];
  await write(data, { fileName, columns: head.map((_, i) => ({ width: widths[i] || 22 })) });
}
