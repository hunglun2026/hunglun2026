// 排程頁連後端：真實版（fetch Worker，帶 Google 登入憑證）與示範版（記憶體假資料，離線可練習）。
// 兩個版本介面一樣：me / schools / addSchool / preview / create / list / approve / pause / resume / remove / testRun / setReal / setGlobalPause
import { planRotation } from "./logic.js?v=20261123c";

export function realScheduleApi(base, getToken) {
  const call = async (method, path, body) => {
    const res = await fetch(base.replace(/\/$/, "") + path, {
      method, headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `請求失敗（${res.status}）`), { status: res.status, data });
    return data;
  };
  return {
    mode: "real",
    me: () => call("GET", "/me"),
    schools: () => call("GET", "/schools"),
    addSchool: (domain, adminEmail) => call("POST", "/schools", { domain, adminEmail }),
    preview: (body) => call("POST", "/preview", body),
    create: (body) => call("POST", "/schedules", body),
    list: () => call("GET", "/schedules"),
    approve: (id) => call("POST", `/schedules/${id}/approve`),
    pause: (id) => call("POST", `/schedules/${id}/pause`),
    resume: (id) => call("POST", `/schedules/${id}/resume`),
    remove: (id) => call("DELETE", `/schedules/${id}`),
    testRun: (id) => call("POST", `/schedules/${id}/test-run`),
    setReal: (id, real) => call("PATCH", `/schedules/${id}`, { dryRunOnly: !real }),
    setGlobalPause: (paused) => call("POST", "/admin/pause", { paused }),
  };
}

// 示範版：假的學校目錄（a 到 n），a、b、c 已有授權。規則簡化，只為了讓畫面能完整練習。
export function demoScheduleApi({ staff = true } = {}) {
  const users = "abcdefghijklmn".split("").map((n) => ({ email: `${n}@demo.school.tw`, suspended: false, archived: false }));
  const holders = new Set(["a", "b", "c"].map((n) => `${n}@demo.school.tw`));
  let nextId = 1, paused = false; const rows = []; const schools = [{ domain: "demo.school.tw", admin_email: "admin@demo.school.tw" }];
  const nap = () => new Promise((r) => setTimeout(r, 250));
  const need = (id) => { const s = rows.find((x) => x.id === id); if (!s) throw new Error("找不到這筆排程"); return s; };
  const plan = (b) => {
    const dates = b.type === "single" ? [b.runDate] : Object.keys(b.months || {}).sort().map((m) => `${m}-01`);
    let add = b.add || [], revoke = b.revoke || [];
    if (b.type === "monthly") { const first = Object.keys(b.months).sort()[0]; add = b.months[first]; revoke = Object.entries(b.months).filter(([m]) => m !== first).flatMap(([, l]) => l); }
    const p = planRotation({ add, revoke, keep: b.keep || [], users, holders });
    const counts = { add: 0, remove: 0, skip: 0, error: 0 }; p.actions.forEach((a) => counts[a.op]++);
    const reasons = []; if (counts.error) reasons.push(`有 ${counts.error} 筆出錯（例如目錄裡找不到這個使用者）`);
    return { runDate: dates[0], counts, safe: !reasons.length, reasons, warnings: p.warnings, actions: p.actions, conflicts: { blocked: [], notes: [] }, dates };
  };
  const checkDomain = (b) => { if (!schools.some((s) => s.domain === b.domain)) throw Object.assign(new Error(`${b.domain} 還沒登記，請聯絡鴻綸登記這間學校（示範版只有 demo.school.tw）`), { status: 404 }); };
  return {
    mode: "demo",
    async me() { await nap(); return { email: staff ? "shen@gfeh.org" : "admin@demo.school.tw", staff, paused }; },
    async schools() { await nap(); return { schools }; },
    async addSchool(domain, adminEmail) { await nap(); schools.push({ domain, admin_email: adminEmail }); return { ok: true, domain }; },
    async preview(b) { await nap(); checkDomain(b); const { dates, ...r } = plan(b); return r; },
    async create(b) {
      await nap(); checkDomain(b); const p = plan(b);
      if (!p.safe) throw new Error("預演沒過，不能建立：" + p.reasons.join("；"));
      const id = nextId++; const status = staff ? "active" : "pending_approval";
      rows.push({ id, domain: b.domain, sku: b.sku, type: b.type, runDates: p.dates, status, dryRunOnly: true, runs: [], testOk: false, approvedBy: staff ? "shen@gfeh.org" : null, createdBy: staff ? "shen@gfeh.org" : "admin@demo.school.tw" });
      return { id, status, notes: [] };
    },
    async list() { await nap(); return { schedules: rows.map((r) => ({ ...r })) }; },
    async approve(id) { await nap(); const s = need(id); s.status = "active"; s.approvedBy = "shen@gfeh.org"; return { status: "active" }; },
    async pause(id) { await nap(); need(id).status = "paused"; return { status: "paused" }; },
    async resume(id) { await nap(); const s = need(id); s.status = s.approvedBy ? "active" : "pending_approval"; return { status: s.status }; },
    async remove(id) { await nap(); rows.splice(rows.indexOf(need(id)), 1); return { ok: true }; },
    async testRun(id) {
      await nap(); const s = need(id); s.testOk = true;
      s.runs.unshift({ runDate: "test:" + new Date().toISOString(), status: "test_ok", counts: { add: 1, remove: 1 } });
      return { ok: true, runDate: s.runDates[0], counts: { add: 1, remove: 1 }, message: "只預演，沒有寫入" };
    },
    async setReal(id, real) { await nap(); const s = need(id); if (real && !s.testOk) throw new Error("要先手動測試一次並通過，才能改成正式執行"); s.dryRunOnly = !real; return { dryRunOnly: !real }; },
    async setGlobalPause(p) { await nap(); paused = p; return { paused }; },
  };
}
