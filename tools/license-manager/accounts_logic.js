// 批次新增帳號、批次轉移組織單位的純邏輯：不碰網路、不碰畫面，瀏覽器與 node 都能跑。
import { cleanEmail } from "./logic.js?v=20261123c";

// 要在後台建立的欄位（對照後台 CSV 範本：名字、姓氏、電子郵件地址、密碼、機構單位路徑、下次登入須變更密碼）
export const CREATE_FIELDS = [
  { key: "last", label: "姓氏", hint: /姓氏|^姓$|last|family|surname/i },
  { key: "first", label: "名字", hint: /名字|^名$|first|given/i },
  { key: "full", label: "姓名（自動拆成姓氏與名字）", hint: /姓名|全名|^name$|display/i },
  { key: "email", label: "電子郵件", hint: /e-?mail|信箱|帳號|電子郵件/i },
  { key: "password", label: "密碼（空白＝系統產生）", hint: /密碼|password/i },
  { key: "ou", label: "組織單位", hint: /組織單位|機構單位|org ?unit|^ou$|班級|單位/i },
];
export const MOVE_FIELDS = [
  { key: "email", label: "電子郵件", hint: /e-?mail|信箱|帳號|電子郵件/i },
  { key: "ou", label: "目標組織單位", hint: /目標|組織單位|機構單位|org ?unit|^ou$|移到|單位/i },
];

// 依標題文字猜每個欄位在哪一欄；回傳 {key: 欄位序號或 -1}。同一欄不會被兩個欄位選走。
export function guessColumns(fields, headers) {
  const used = new Set(), out = {};
  for (const f of fields) {
    let hit = -1;
    headers.forEach((h, i) => { if (hit < 0 && !used.has(i) && f.hint.test(String(h || ""))) hit = i; });
    out[f.key] = hit; if (hit >= 0) used.add(hit);
  }
  return out;
}

// 組織單位路徑統一成 "/A/B"；空白或 "/" 是最上層
export function normalizeOu(v, domain = "") {
  let s = String(v ?? "").trim().replace(/\\/g, "/").replace(/\s*\/\s*/g, "/");
  if (domain && s.toLowerCase() === domain.toLowerCase()) return "/";
  if (!s || s === "/") return "/";
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/\/+$/, "").replace(/\/{2,}/g, "/") || "/";
}

// 中文姓名拆成姓氏＋名字（常見複姓照複姓切）；西式「First Last」第一個字是名字
const COMPOUND = ["歐陽", "司馬", "上官", "諸葛", "司徒", "東方", "夏侯", "皇甫", "尉遲", "公孫", "慕容", "令狐", "長孫", "宇文", "軒轅", "端木", "獨孤", "南宮", "百里", "鍾離", "呼延", "澹台", "聞人", "第五", "范姜", "張簡"];
export function splitName(full) {
  const s = String(full ?? "").trim().replace(/\s+/g, " ");
  if (!s) return { last: "", first: "" };
  if (/[一-鿿]/.test(s) && !s.includes(" ")) {
    const comp = COMPOUND.find((c) => s.startsWith(c) && s.length > c.length);
    const n = comp ? 2 : 1;
    return s.length <= 1 ? { last: s, first: s } : { last: s.slice(0, n), first: s.slice(n) };
  }
  const parts = s.split(" ");
  return parts.length === 1 ? { first: parts[0], last: parts[0] } : { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

// 隨機密碼：12 碼，避開容易看錯的字，一定含大寫、小寫、數字、符號
export function genPassword(len = 12, rand = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }) {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ", L = "abcdefghijkmnopqrstuvwxyz", D = "23456789", S = "!@#$%&*?";
  const all = U + L + D + S, pick = (s) => s[rand(s.length)];
  const chars = [pick(U), pick(L), pick(D), pick(S)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

// rows: [{first,last,full,email,password,ou}]；ctx: {existing:Set(信箱), ous:Set(路徑), domains:Set(網域), defaultOu, domain}
// 回傳 {actions:[{op:'create'|'skip'|'error', email, reason, user}], warnings:[]}
export function planCreate(rows, ctx, rand) {
  const actions = [], warnings = [], seen = new Set();
  for (const r of rows) {
    const raw = String(r.email ?? "").trim();
    if (!raw && !String(r.full ?? r.first ?? r.last ?? "").trim()) continue; // 整列空白
    const email = cleanEmail(raw);
    if (!email) { actions.push({ op: "error", email: raw, reason: "電子郵件格式不對" }); continue; }
    if (seen.has(email)) { actions.push({ op: "error", email, reason: "名單裡重複出現" }); continue; }
    seen.add(email);
    if (ctx.existing.has(email)) { actions.push({ op: "skip", email, reason: "帳號已存在，不重複建立" }); continue; }
    let { first, last } = r;
    if ((!first || !last) && r.full) { const n = splitName(r.full); first = first || n.first; last = last || n.last; }
    if (!String(first || "").trim() || !String(last || "").trim()) { actions.push({ op: "error", email, reason: "缺姓氏或名字" }); continue; }
    const ou = normalizeOu(r.ou || ctx.defaultOu || "/", ctx.domain);
    if (ctx.ous && !ctx.ous.has(ou)) { actions.push({ op: "error", email, reason: `組織單位「${ou}」不存在` }); continue; }
    let password = String(r.password ?? ""), generated = false;
    if (!password) { password = genPassword(12, rand); generated = true; }
    else if (password.length < 8) { actions.push({ op: "error", email, reason: "密碼至少 8 個字元" }); continue; }
    const dom = email.split("@")[1];
    if (ctx.domains && ctx.domains.size && !ctx.domains.has(dom)) warnings.push(`${email} 的網域 ${dom} 目前沒有任何現有使用者，請確認沒有打錯`);
    actions.push({ op: "create", email, reason: generated ? "新增（密碼由系統產生）" : "新增", user: { email, first: String(first).trim(), last: String(last).trim(), password, generated, ou } });
  }
  return { actions, warnings: [...new Set(warnings)] };
}

// rows: [{email, ou}]；ctx: {users:Map(信箱 -> {ou, suspended}), ous:Set(路徑), domain}
// 回傳 {actions:[{op:'move'|'skip'|'error', email, from, to, reason}], warnings:[]}
export function planMove(rows, ctx) {
  const actions = [], seen = new Set();
  for (const r of rows) {
    const raw = String(r.email ?? "").trim();
    if (!raw && !String(r.ou ?? "").trim()) continue;
    const email = cleanEmail(raw);
    if (!email) { actions.push({ op: "error", email: raw, reason: "電子郵件格式不對" }); continue; }
    if (seen.has(email)) { actions.push({ op: "error", email, reason: "名單裡重複出現" }); continue; }
    seen.add(email);
    const u = ctx.users.get(email);
    if (!u) { actions.push({ op: "error", email, reason: "目錄裡找不到這個使用者" }); continue; }
    if (!String(r.ou ?? "").trim()) { actions.push({ op: "error", email, from: u.ou, reason: "沒有填目標組織單位" }); continue; }
    const to = normalizeOu(r.ou, ctx.domain);
    if (ctx.ous && !ctx.ous.has(to)) { actions.push({ op: "error", email, from: u.ou, to, reason: `組織單位「${to}」不存在` }); continue; }
    if (u.ou === to) { actions.push({ op: "skip", email, from: u.ou, to, reason: "已經在這個組織單位" }); continue; }
    actions.push({ op: "move", email, from: u.ou, to, reason: u.suspended ? "移動（此帳號已停權）" : "移動" });
  }
  return { actions, warnings: [] };
}

export function countOps(actions) { const c = {}; for (const a of actions) c[a.op] = (c[a.op] || 0) + 1; return c; }

// 並行執行：最多 concurrency 個同時跑，遇到暫時性錯誤（kind=transient）由 worker 自己重試；回傳每筆結果
export async function runPool(items, worker, { concurrency = 4, onResult = () => {}, shouldStop = () => false } = {}) {
  const results = new Array(items.length); let next = 0;
  async function lane() {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      try { await worker(items[i], i); results[i] = { ok: true }; }
      catch (e) { results[i] = { ok: false, kind: e.kind || "other", message: e.message }; }
      onResult(items[i], results[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}
