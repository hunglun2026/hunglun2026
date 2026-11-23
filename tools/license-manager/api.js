// 與 Google 溝通：真實版（用管理員自己的登入 token 直接打 REST API）與示範版（記憶體假資料，可練習、可離線測試）。
import { classify } from "./logic.js";

const DIR = "https://admin.googleapis.com/admin/directory/v1/users";
const LIC = "https://licensing.googleapis.com/apps/licensing/v1";
async function call(token, url, init = {}, retries = 4) {
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

export function realApi(token, domain, { product, sku }) {
  const base = `${LIC}/product/${product}/sku/${sku}`;
  return {
    mode: "real",
    async listUsers() {
      const out = []; let pt = "";
      do {
        const r = await call(token, `${DIR}?customer=my_customer&maxResults=500&fields=nextPageToken,users(primaryEmail,suspended,archived)${pt ? `&pageToken=${pt}` : ""}`);
        for (const u of r.users || []) out.push({ email: u.primaryEmail.toLowerCase(), suspended: !!u.suspended, archived: !!u.archived });
        pt = r.nextPageToken || "";
      } while (pt);
      return out;
    },
    async listHolders() {
      const out = new Set(); let pt = "";
      do {
        const r = await call(token, `${base}/users?customerId=${encodeURIComponent(domain)}&maxResults=100${pt ? `&pageToken=${pt}` : ""}`);
        for (const i of r.items || []) out.add(i.userId.toLowerCase());
        pt = r.nextPageToken || "";
      } while (pt);
      return out;
    },
    addLicense: (email) => call(token, `${base}/user`, { method: "POST", body: JSON.stringify({ userId: email }) }),
    removeLicense: (email) => call(token, `${base}/user/${encodeURIComponent(email)}`, { method: "DELETE" }),
  };
}

// 示範版：模擬「收回後位子要幾秒才釋出」與額度上限，讓畫面能完整練習。
export function demoApi({ seats = 4, releaseDelayMs = 1500 } = {}) {
  const users = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"].map((n) => ({ email: `${n}@demo.school.tw`, suspended: n === "n", archived: false }));
  const holders = new Set(["a@demo.school.tw", "b@demo.school.tw", "c@demo.school.tw", "keep@demo.school.tw"]);
  users.push({ email: "keep@demo.school.tw", suspended: false, archived: false });
  const pendingRelease = []; // 收回後延遲才算空出
  return {
    mode: "demo",
    listUsers: async () => users.map((u) => ({ ...u })),
    listHolders: async () => new Set(holders),
    async addLicense(email) {
      const free = seats - holders.size - pendingRelease.filter((t) => t > Date.now()).length;
      if (holders.has(email)) { const e = new Error("already"); e.kind = "already"; throw e; }
      if (free <= 0) { const e = new Error("There aren't enough available licenses for the specified product-SKU combination."); e.kind = "quota"; throw e; }
      holders.add(email);
    },
    async removeLicense(email) { holders.delete(email); pendingRelease.push(Date.now() + releaseDelayMs); },
  };
}
