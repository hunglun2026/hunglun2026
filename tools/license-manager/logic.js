// 授權輪替的純邏輯：不碰網路、不碰畫面，瀏覽器與 node 都能跑。
// 規則與 Python 版 gadmin_license/rotate.py、plan.py 一致（改一邊要同步改另一邊，tests/logic.test.mjs 逐項比對）。

export const SKUS = {
  "ai-pro": { product: "101047", sku: "1010470004", name: "Google AI Pro for Education" },
  "teaching-learning": { product: "101037", sku: "1010370001", name: "Teaching and Learning Upgrade" },
  "plus": { product: "101031", sku: "1010310008", name: "Education Plus" },
  "plus-staff": { product: "101031", sku: "1010310009", name: "Education Plus (Staff)" },
};
// Fundamentals、Gmail Only、封存使用者 SKU 受保護，網頁不提供也不接受

export const QUOTA_RETRY_WAITS = [5, 10, 20, 40, 60]; // 剛收回的位子要幾秒才釋出（2026-11-22 實測）

export function parseEmails(text) {
  const seen = new Set();
  for (const part of String(text || "").split(/[\s,;，；]+/)) {
    const e = part.trim().toLowerCase();
    if (e.includes("@")) seen.add(e);
  }
  return [...seen];
}

export function classify(status, message) {
  const m = (message || "").toLowerCase();
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409 || m.includes("already")) return "already";
  if (m.includes("mutually exclusive") || m.includes("conflict")) return "conflict";
  if (["not enough", "enough available", "aren't enough", "insufficient", "quota", "exceed", "no available", "no licenses"]
    .some((w) => m.includes(w))) return "quota";
  if (status === 429 || status >= 500) return "transient";
  return "other";
}

// users: [{email, suspended, archived}]；holders: Set(信箱)；回傳 {actions:[{op,email,reason}], warnings:[]}
// op：remove／add／skip／error。先收回、再指派。
export function planRotation({ add, revoke, keep = [], users, holders }) {
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const protectedSet = new Set(keep.map((e) => e.toLowerCase()));
  const warnings = [];
  const addSet = new Set(add);
  const actions = [];

  const both = revoke.filter((e) => addSet.has(e));
  for (const e of both) warnings.push(`${e} 同時出現在「要收回」與「要指派」，請修正名單`);

  const judge = (email, mode) => {
    const u = byEmail.get(email);
    if (protectedSet.has(email)) return { op: "skip", email, reason: "在保留名單，不異動" };
    if (!u) return { op: "error", email, reason: "目錄裡找不到這個使用者" };
    if (u.archived) return { op: "skip", email, reason: "封存使用者，不能指派一般授權" };
    if (u.suspended) return { op: "skip", email, reason: "已停權" };
    if (mode === "remove") return holders.has(email) ? { op: "remove", email, reason: "目前有此授權" } : null; // 本來就沒有：不列，免得洗版
    return holders.has(email) ? { op: "skip", email, reason: "已有此授權" } : { op: "add", email, reason: "沒有此授權" };
  };

  for (const e of revoke) { if (!addSet.has(e)) { const a = judge(e, "remove"); if (a) actions.push(a); } }
  for (const e of add) { if (!both.includes(e)) actions.push(judge(e, "add")); }
  return { actions, warnings, conflicts: both };
}

export function counts(actions) {
  const c = { add: 0, remove: 0, skip: 0, error: 0 };
  for (const a of actions) c[a.op]++;
  return c;
}

// available：後台訂閱頁的可用數（沒填就是 null）。收回的位子可重用。回傳空字串＝沒問題。
export function checkAvailable(actions, available) {
  if (available === null || available === undefined || available === "") return "";
  const c = counts(actions);
  const n = Number(available);
  if (c.add > n + c.remove) return `可用授權只有 ${n}，收回 ${c.remove} 位後仍不夠指派 ${c.add} 位（缺 ${c.add - n - c.remove}）`;
  return "";
}

// 只檢查「這次真的動過的人」：指派的要有、收回的不能有。被跳過的人（停權、保留名單、本來就沒有）不算。
export function verifyAfter(actions, holdersNow) {
  const problems = [];
  for (const a of actions) {
    if (a.op === "add" && !holdersNow.has(a.email)) problems.push(`${a.email} 應該有授權但沒有`);
    if (a.op === "remove" && holdersNow.has(a.email)) problems.push(`${a.email} 應該被收回但還有授權`);
  }
  return problems;
}

// 執行：api = {addLicense(email), removeLicense(email)}；回傳 {ok, failed, stopped, rows}
export async function execute(actions, api, { maxChanges = 30, sleep = (s) => new Promise((r) => setTimeout(r, s * 1000)), onRow = () => {}, onWait = () => {} } = {}) {
  const todo = actions.filter((a) => a.op === "add" || a.op === "remove");
  if (todo.length > maxChanges) throw new Error(`要異動 ${todo.length} 位，超過上限 ${maxChanges}，已中止`);
  const result = { ok: 0, failed: 0, stopped: "", rows: [] };
  let removedAny = false;
  for (const a of todo) {
    const row = { time: new Date().toLocaleTimeString("zh-TW", { hour12: false }), email: a.email, op: a.op };
    const waits = a.op === "add" && removedAny ? [...QUOTA_RETRY_WAITS] : [];
    for (;;) {
      try {
        await (a.op === "add" ? api.addLicense(a.email) : api.removeLicense(a.email));
        row.result = "ok"; result.ok++; removedAny = removedAny || a.op === "remove";
        break;
      } catch (e) {
        if (e.kind === "quota" && waits.length) {
          const w = waits.shift(); onWait(a.email, w); await sleep(w); continue;
        }
        row.result = "fail"; row.kind = e.kind; row.message = e.message; result.failed++;
        if (e.kind === "forbidden" || e.kind === "quota") result.stopped = `${e.kind}：${e.message}`;
        break;
      }
    }
    result.rows.push(row); onRow(row);
    if (result.stopped) break;
  }
  return result;
}
