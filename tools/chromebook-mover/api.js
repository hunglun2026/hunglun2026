// 與 Google 溝通：真實版（管理員自己的登入 token 直接打 Directory API 的 ChromeOS 裝置）與示範版（記憶體假資料，離線可練習）。
import { classify, normalizeOu, cleanSerial, BATCH_SIZE } from "./logic.js?v=20261125a";

const DIR = "https://admin.googleapis.com/admin/directory/v1";
// 搬裝置要 chromeos 範圍（寫入）；讀組織單位用 orgunit.readonly。官方文件：moveDevicesToOu 單次最多 50 台。
export const SCOPES = "openid email https://www.googleapis.com/auth/admin.directory.device.chromeos https://www.googleapis.com/auth/admin.directory.orgunit.readonly";

export async function call(token, url, init = {}, retries = 4) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (res.ok) return res.status === 204 ? {} : res.json().catch(() => ({}));
    let msg = res.statusText;
    try { msg = (await res.json()).error.message; } catch { /* 不是 JSON 就用狀態文字 */ }
    const kind = classify(res.status, msg);
    if (kind === "transient" && i < retries) { await new Promise((r) => setTimeout(r, 2 ** i * 1000)); continue; }
    const err = new Error(msg); err.kind = kind; err.status = res.status; throw err;
  }
}

// 把裝置清單整理成 序號 -> {id, ou, status, model, dup}。同序號有多台時標 dup（官方文件沒保證序號唯一）。
export function indexDevices(list) {
  const out = new Map();
  for (const d of list) {
    const serial = cleanSerial(d.serialNumber);
    if (!serial) continue;
    const item = { id: d.deviceId, ou: normalizeOu(d.orgUnitPath || "/"), status: d.status || "", model: d.model || "" };
    out.set(serial, out.has(serial) ? { ...out.get(serial), dup: true } : item);
  }
  return out;
}

export function realApi(token) {
  return {
    mode: "real",
    // 官方文件：每頁最多 300 台；query 可用欄位文件沒列，所以不用伺服器端搜尋，整份列出來在瀏覽器比對序號。
    async listDevices() {
      const all = []; let pt = "";
      do {
        const r = await call(token, `${DIR}/customer/my_customer/devices/chromeos?projection=BASIC&maxResults=300&fields=nextPageToken,chromeosdevices(deviceId,serialNumber,orgUnitPath,status,model)${pt ? `&pageToken=${pt}` : ""}`);
        all.push(...(r.chromeosdevices || []));
        pt = r.nextPageToken || "";
      } while (pt);
      return indexDevices(all);
    },
    async listOrgUnits() {
      const r = await call(token, `${DIR}/customer/my_customer/orgunits?type=all&fields=organizationUnits(orgUnitPath)`);
      return new Set(["/", ...(r.organizationUnits || []).map((o) => o.orgUnitPath)]);
    },
    moveDevices: (ids, ou) => call(token, `${DIR}/customer/my_customer/devices/chromeos/moveDevicesToOu?orgUnitPath=${encodeURIComponent(ou)}`, { method: "POST", body: JSON.stringify({ deviceIds: ids }) }),
  };
}

export function demoApi() {
  const mk = (serial, ou, status = "ACTIVE") => ({ serialNumber: serial, deviceId: "id-" + serial, orgUnitPath: ou, status, model: "Demo Chromebook 11" });
  const devices = [
    mk("CB1000001", "/學生/一年級"), mk("CB1000002", "/學生/一年級"), mk("CB1000003", "/學生/二年級"),
    mk("CB1000004", "/學生/二年級"), mk("CB1000005", "/老師"), mk("CB1000006", "/學生/一年級", "DISABLED"),
    mk("CB1000007", "/學生/一年級", "DEPROVISIONED"), mk("CB1000008", "/學生/二年級", "INACTIVE"),
  ];
  const ous = new Set(["/", "/老師", "/學生", "/學生/一年級", "/學生/二年級", "/學生/三年級", "/待報廢"]);
  const err = (kind, msg) => Object.assign(new Error(msg), { kind });
  return {
    mode: "demo",
    listDevices: async () => indexDevices(devices.map((d) => ({ ...d }))),
    listOrgUnits: async () => new Set(ous),
    async moveDevices(ids, ou) {
      await new Promise((r) => setTimeout(r, 80));
      if (ids.length > BATCH_SIZE) throw err("other", `一次最多 ${BATCH_SIZE} 台`);
      if (!ous.has(ou)) throw err("bad_ou", "Invalid Ou Id");
      const rows = ids.map((id) => devices.find((d) => d.deviceId === id));
      if (rows.some((d) => !d)) throw err("not_found", "Resource Not Found: deviceId");
      rows.forEach((d) => { d.orgUnitPath = ou; });
    },
  };
}
