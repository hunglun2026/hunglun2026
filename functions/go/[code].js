/**
 * 研習現場短連結（Cloudflare Pages Function）
 *
 * hunglun.com/go/<代碼> → 要求輸入該場的口令 → 答對才 302 導到真正的
 * Google 文件網址。密碼答對後發一個範圍限定在 /go/<code> 的 cookie，
 * 同一堂課期間不用重打；換一場代碼要重新輸入，因為每場學員不同、
 * 口令也不一樣，不共用登入狀態。
 *
 * 每場的口令、標題、目的地網址在 ./_sessions.js 維護；同一個檔案裡的
 * MASTER_PASSWORD 是講師專屬密碼，不管哪一場代碼都能用它直接進去。
 */
import { GO_SESSIONS, MASTER_PASSWORD } from './_sessions.js';

const MAX_AGE = 60 * 60 * 8; // 8 小時，蓋過一整天的研習

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 固定長度比對，避免逐字元比較洩漏時間差資訊。
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? match[1] : null;
}

function loginPage(code, label, error) {
  const errorHtml = error
    ? '<p style="color:#c0392b;font-size:14px;margin:0 0 14px;">口令不對，再試一次。</p>'
    : '';
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>研習教材：需要口令</title>
<style>
  body{font-family:-apple-system,"Microsoft JhengHei",sans-serif;background:#f4f6f9;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}
  .box{background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);
    padding:36px 32px;max-width:360px;width:100%;text-align:center;box-sizing:border-box;}
  h1{font-size:17px;margin:0 0 6px;color:#1a1a1a;}
  p.hint{color:#6b7280;font-size:13px;margin:0 0 20px;}
  input{width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;
    border-radius:8px;font-size:16px;margin-bottom:14px;text-align:center;letter-spacing:2px;}
  button{width:100%;padding:11px;border:0;border-radius:8px;background:#1a73e8;
    color:#fff;font-size:15px;font-weight:600;cursor:pointer;}
  button:hover{background:#1558b0;}
</style></head>
<body>
  <div class="box">
    <h1>${label}</h1>
    <p class="hint">請輸入講師現場公佈的口令</p>
    ${errorHtml}
    <form method="POST" action="/go/${code}">
      <input type="text" name="password" autofocus required inputmode="text">
      <button type="submit">進入教材</button>
    </form>
  </div>
</body></html>`;
}

export async function onRequest({ request, params }) {
  const code = String(params.code || '');
  const session = GO_SESSIONS[code];
  if (!session) {
    return new Response('找不到這場研習的連結，請確認代碼是否正確。', { status: 404 });
  }

  const cookieName = `hlt_go_${code}`;
  const expectedHash = await sha256Hex(session.password);
  const cookieValue = getCookie(request, cookieName);
  if (cookieValue && timingSafeEqual(cookieValue, expectedHash)) {
    return Response.redirect(session.url, 302);
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const input = String(form.get('password') || '');
    if (timingSafeEqual(input, session.password) || timingSafeEqual(input, MASTER_PASSWORD)) {
      const headers = new Headers({ Location: session.url });
      headers.append(
        'Set-Cookie',
        `${cookieName}=${expectedHash}; Path=/go/${code}; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`
      );
      return new Response(null, { status: 302, headers });
    }
    return new Response(loginPage(code, session.label, true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(loginPage(code, session.label, false), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
