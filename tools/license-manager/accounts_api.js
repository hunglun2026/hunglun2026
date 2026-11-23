// 帳號與組織單位的 Directory API（需要 admin.directory.user 寫入權限與 admin.directory.orgunit.readonly）
import { call } from "./api.js?v=20261123b";

const DIR = "https://admin.googleapis.com/admin/directory/v1";
export const ACCOUNT_SCOPES = "https://www.googleapis.com/auth/admin.directory.user https://www.googleapis.com/auth/admin.directory.orgunit.readonly";

export function dirApi(token) {
  return {
    mode: "real",
    async listUsers() {
      const out = []; let pt = "";
      do {
        const r = await call(token, `${DIR}/users?customer=my_customer&maxResults=500&fields=nextPageToken,users(primaryEmail,suspended,archived,orgUnitPath,name(fullName))${pt ? `&pageToken=${pt}` : ""}`);
        for (const u of r.users || []) out.push({ email: u.primaryEmail.toLowerCase(), ou: u.orgUnitPath || "/", suspended: !!u.suspended, archived: !!u.archived, name: u.name?.fullName || "" });
        pt = r.nextPageToken || "";
      } while (pt);
      return out;
    },
    async listOrgUnits() {
      const r = await call(token, `${DIR}/customer/my_customer/orgunits?type=all&fields=organizationUnits(orgUnitPath)`);
      return new Set(["/", ...(r.organizationUnits || []).map((o) => o.orgUnitPath)]);
    },
    createUser: (u) => call(token, `${DIR}/users`, { method: "POST", body: JSON.stringify({
      primaryEmail: u.email, name: { givenName: u.first, familyName: u.last }, password: u.password, orgUnitPath: u.ou, changePasswordAtNextLogin: u.change !== false,
    }) }),
    moveUser: (email, ou) => call(token, `${DIR}/users/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify({ orgUnitPath: ou }) }),
    deleteUser: (email) => call(token, `${DIR}/users/${encodeURIComponent(email)}`, { method: "DELETE" }),
  };
}

// 示範版：記憶體假資料，可離線練習
export function demoDirApi() {
  const users = new Map([
    ["old1@demo.school.tw", { ou: "/老師", suspended: false, name: "舊老師" }],
    ["s1@demo.school.tw", { ou: "/學生/一年級", suspended: false, name: "學生一" }],
    ["s2@demo.school.tw", { ou: "/學生/一年級", suspended: false, name: "學生二" }],
    ["s3@demo.school.tw", { ou: "/學生/二年級", suspended: true, name: "學生三" }],
  ]);
  const ous = new Set(["/", "/老師", "/學生", "/學生/一年級", "/學生/二年級", "/學生/三年級"]);
  const err = (kind, msg) => Object.assign(new Error(msg), { kind });
  return {
    mode: "demo",
    listUsers: async () => [...users].map(([email, u]) => ({ email, ...u, archived: false })),
    listOrgUnits: async () => new Set(ous),
    async createUser(u) { await new Promise((r) => setTimeout(r, 60)); if (users.has(u.email)) throw err("already", "Entity already exists."); users.set(u.email, { ou: u.ou, suspended: false, name: u.last + u.first }); },
    async moveUser(email, ou) { await new Promise((r) => setTimeout(r, 60)); if (!users.has(email)) throw err("not_found", "Resource Not Found: userKey"); users.get(email).ou = ou; },
    async deleteUser(email) { users.delete(email); },
  };
}
