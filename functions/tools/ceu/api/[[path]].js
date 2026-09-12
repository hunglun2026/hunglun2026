/**
 * /tools/ceu/api/* ：CEU（Chrome Enterprise Upgrade 批次綁定工具）內建金鑰的後端代理
 *
 * 為什麼要有這一層：tools/ceu.html 原本把兩把 Google API key 直接寫死在前端 JS
 * 裡（一把查裝置型號、一把跑 preProvisionedDevices 的新增／刪除），只要看網頁原始碼
 * 就能複製走，等於沒鎖。這支代理讓瀏覽器只打自己網域，真正的 key 只存在
 * Cloudflare 環境變數裡，不會出現在送到瀏覽器的任何回應中。
 *
 * 這支路徑掛在 /tools/ceu/ 底下，會自動繼承 functions/tools/_middleware.js
 * 的密碼保護（同事要先通過該頁密碼才打得到這裡），是第二層防護，不是唯一防線。
 *
 * 只代理三個固定操作，不是通用轉發，避免被當成打任意 Google API 的跳板：
 *   GET  /tools/ceu/api/hardware-models        → hardwareModelAndBrandCodes（查型號代碼）
 *   POST /tools/ceu/api/devices/batch-create    → preProvisionedDevices:batchCreate（批次綁定）
 *   DELETE /tools/ceu/api/devices/<deviceId>    → preProvisionedDevices/<id>（解除綁定）
 *
 * 前端「貼上自己的 API Key」那條路完全不受影響，那是使用者自己的金鑰，
 * 直接打 Google 就好，不需要也不應該經過這裡。
 *
 * 需要的環境變數（Cloudflare Pages 專案 → 設定 → 環境變數設定，Production 與
 * Preview 都要）：
 *   CEU_API_KEY   原本寫死在 ceu.html 裡的那把內建金鑰
 * 沒設的話這支會回 503，內建金鑰按鈕會顯示失敗訊息，不會讓任何呼叫悄悄失敗又假裝成功。
 */

const GOOGLE_BASE = 'https://chromecommercial.googleapis.com/v1';
// preProvisionedDevices 的 id 是 UUID 或「preProvisionedDevices/UUID」，這裡只收乾淨的
// UUID 格式，其餘一律拒絕，避免有人把奇怪字串塞進轉發的網址。
const DEVICE_ID_RE = /^[a-fA-F0-9-]{20,80}$/;

export async function onRequest({ request, env, params }) {
  if (!env.CEU_API_KEY) {
    console.error('缺少環境變數：CEU_API_KEY');
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const path = Array.isArray(params.path) ? params.path : [];
  const method = request.method;

  if (method === 'GET' && path.length === 1 && path[0] === 'hardware-models') {
    return forward(`${GOOGLE_BASE}/hardwareModelAndBrandCodes?key=${env.CEU_API_KEY}`, { method: 'GET' });
  }

  if (method === 'POST' && path.length === 2 && path[0] === 'devices' && path[1] === 'batch-create') {
    const body = await request.text();
    return forward(`${GOOGLE_BASE}/preProvisionedDevices:batchCreate?key=${env.CEU_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  }

  if (method === 'DELETE' && path.length === 2 && path[0] === 'devices') {
    const id = path[1];
    if (!DEVICE_ID_RE.test(id)) {
      return json({ ok: false, error: 'bad_device_id' }, 400);
    }
    return forward(`${GOOGLE_BASE}/preProvisionedDevices/${id}?key=${env.CEU_API_KEY}`, { method: 'DELETE' });
  }

  return json({ ok: false, error: 'not_found' }, 404);
}

async function forward(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    console.error('ceu_proxy_unreachable: ' + err);
    return json({ ok: false, error: 'upstream_unreachable' }, 502);
  }
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
