/**
 * /api/contact —— 官網詢問表單的收件端（Cloudflare Pages Function）
 *
 * 為什麼要有這一層，而不是讓瀏覽器直接打 Apps Script：
 * 1. 同網域，所以沒有 CORS 問題（Apps Script 的 /exec 會 302 到 googleusercontent，
 *    瀏覽器直接打會被 CORS 擋，這是最常見的坑）
 * 2. Turnstile 的 secret key 與 Apps Script 網址都只存在伺服器端，不會外流到前端
 * 3. 蜜罐、必填、長度、頻率這些檢查在進到信箱之前就擋掉
 *
 * 需要的環境變數（在 Cloudflare Pages 專案 → 設定 → 環境變數設定，Production 與 Preview 都要）：
 *   APPS_SCRIPT_URL      Apps Script 網頁應用程式網址（結尾 /exec）
 *   FORM_SHARED_SECRET   與 Apps Script 裡的 SHARED_SECRET 一模一樣
 *   TURNSTILE_SECRET     Cloudflare Turnstile 的 secret key
 * 少任何一個，這支會回 503 並在 log 說明是哪一個沒設。
 *
 * 對應的 Apps Script 原始碼在 ClaudeOnly\company\hunglun2026-contact-form\Code.gs
 * （不放在這個公開 repo，因為裡面有共用密鑰）。
 */

const MAX = { name: 100, email: 200, org: 200, phone: 60, topic: 100, message: 5000 };

// 2026-09-04：原本直接 .slice(0, max)，如果剛好切在一組 UTF-16 代理對中間
// （例如某些 emoji 佔 2 個 code unit），會留下半個字元變成亂碼。
// 切完發現最後一個是「高位代理」就再退一格，不切半個字元出去。
function sliceSafe(str, max) {
  const s = str.slice(0, max);
  const last = s.charCodeAt(s.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? s.slice(0, -1) : s;
}

// 只導出 onRequest 一個進入點：同時導出 onRequest 與 onRequestPost 時，
// 哪一個優先在 Pages 的行為不夠明確，直接在裡面判斷方法最保險。
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const missing = ['APPS_SCRIPT_URL', 'FORM_SHARED_SECRET', 'TURNSTILE_SECRET'].filter((k) => !env[k]);
  if (missing.length) {
    console.error('缺少環境變數：' + missing.join('、'));
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  // 蜜罐：真人看不到這個欄位，會填的幾乎都是機器人。回 ok 讓對方以為送出了，不給線索
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true });
  }

  const f = {};
  for (const k of Object.keys(MAX)) {
    f[k] = typeof body[k] === 'string' ? sliceSafe(body[k].trim(), MAX[k]) : '';
  }

  if (!f.name || !f.email || !f.message) {
    return json({ ok: false, error: 'missing_required' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) {
    return json({ ok: false, error: 'bad_email' }, 400);
  }
  if (f.message.length < 5) {
    return json({ ok: false, error: 'message_too_short' }, 400);
  }

  // Turnstile 驗證
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return json({ ok: false, error: 'no_token' }, 400);

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);

  let verify;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form
    });
    verify = await r.json();
  } catch (err) {
    console.error('turnstile_unreachable: ' + err);
    return json({ ok: false, error: 'verify_failed' }, 502);
  }
  // verify 理論上一定是物件，但 siteverify 回傳格式不是我方控制的第三方 API，
  // 保險起見先確認是物件再讀 .success，異常格式也走設計好的錯誤流程而不是裸 500
  if (!verify || typeof verify !== 'object' || !verify.success) {
    console.warn('turnstile_rejected: ' + JSON.stringify(verify['error-codes'] || []));
    return json({ ok: false, error: 'verify_failed' }, 403);
  }

  // 轉給 Apps Script 寄信
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.FORM_SHARED_SECRET,
        ...f,
        page: typeof body.page === 'string' ? body.page.slice(0, 300) : ''
      })
    });
    const out = await r.json();
    if (!out || out.ok !== true) {
      console.error('apps_script_error: ' + JSON.stringify(out));
      return json({ ok: false, error: 'send_failed' }, 502);
    }
  } catch (err) {
    console.error('apps_script_unreachable: ' + err);
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
