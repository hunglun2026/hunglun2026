// 與 Google 溝通：真實版（管理員自己的登入 token 直接打 Directory API）與示範版（記憶體假資料，離線可練習）。
import { classify, normalizeOu } from "./logic.js?v=20261125a";

const DIR = "https://admin.googleapis.com/admin/directory/v1";
export const SCOPES = "openid email https://www.googleapis.com/auth/admin.directory.user https://www.googleapis.com/auth/admin.directory.orgunit.readonly";

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

export function realApi(token) {
  return {
    mode: "real",
    async listUsers() {
      const out = new Map(); let pt = "";
      do {
        const r = await call(token, `${DIR}/users?customer=my_customer&maxResults=500&fields=nextPageToken,users(primaryEmail,suspended,orgUnitPath,name(fullName))${pt ? `&pageToken=${pt}` : ""}`);
        for (const u of r.users || []) out.set(u.primaryEmail.toLowerCase(), { ou: normalizeOu(u.orgUnitPath || "/"), suspended: !!u.suspended, name: u.name?.fullName || "" });
        pt = r.nextPageToken || "";
      } while (pt);
      return out;
    },
    async listOrgUnits() {
      const r = await call(token, `${DIR}/customer/my_customer/orgunits?type=all&fields=organizationUnits(orgUnitPath)`);
      return new Set(["/", ...(r.organizationUnits || []).map((o) => o.orgUnitPath)]);
    },
    moveUser: (email, ou) => call(token, `${DIR}/users/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify({ orgUnitPath: ou }) }),
  };
}

export function demoApi() {
  const users = new Map([
    ["t1@demo.school.tw", { ou: "/老師", suspended: false, name: "甲老師" }],
    ["t2@demo.school.tw", { ou: "/老師", suspended: false, name: "乙老師" }],
    ["s1@demo.school.tw", { ou: "/學生/一年級", suspended: false, name: "學生一" }],
    ["s2@demo.school.tw", { ou: "/學生/一年級", suspended: false, name: "學生二" }],
    ["s3@demo.school.tw", { ou: "/學生/二年級", suspended: true, name: "學生三" }],
    ["s4@demo.school.tw", { ou: "/學生/二年級", suspended: false, name: "學生四" }],
  ]);
  const ous = new Set(["/", "/老師", "/學生", "/學生/一年級", "/學生/二年級", "/學生/三年級", "/畢業生"]);
  const err = (kind, msg) => Object.assign(new Error(msg), { kind });
  return {
    mode: "demo",
    listUsers: async () => new Map([...users].map(([k, v]) => [k, { ...v }])),
    listOrgUnits: async () => new Set(ous),
    async moveUser(email, ou) {
      await new Promise((r) => setTimeout(r, 60));
      if (!users.has(email)) throw err("not_found", "Resource Not Found: userKey");
      if (!ous.has(ou)) throw err("bad_ou", "Invalid Ou Id");
      users.get(email).ou = ou;
    },
  };
}
