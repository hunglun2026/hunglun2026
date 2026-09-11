/**
 * /tools 底下商用工具的密碼保護（Cloudflare Pages Functions middleware）
 *
 * 為什麼要做成伺服器端驗證，而不是像 tools/ceu.html 內部那樣把密碼寫成前端 JS
 * 常數：常數寫法只要看網頁原始碼（View Source）就能直接讀到密碼，等於沒鎖。
 * 這支中介層攔在靜態檔案被送出去之前檢查身分，密碼本身完全不會出現在送到
 * 瀏覽器的 HTML／JS 裡——瀏覽器只會拿到一組雜湊過的 cookie。
 *
 * 只保護下面 PROTECTED_PATHS 列出的路徑，tools/mail 等既有免費工具不受影響。
 *
 * 需要的環境變數（Cloudflare Pages 專案 → 設定 → 環境變數設定，Production 與
 * Preview 都要）：
 *   INTERNAL_TOOLS_PASSWORD   同事登入這幾個商用工具頁面要輸入的密碼
 * 沒設的話這支會直接回 503，不會讓任何人繞過去。
 */

const PROTECTED_PATHS = ['/tools/ceu', '/tools/flex-deploy', '/tools/downloads/flex-deploy-tool.zip'];
const COOKIE_NAME = 'hlt_tools_auth';
// 刻意不設 Max-Age：這是 session cookie，瀏覽器關掉就失效，不長期記住登入狀態。
// 同一次瀏覽（手冊看完按下載）不用重打密碼，但沒有「30 天內都不用再輸入」這種殘留。

function isProtected(pathname) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 固定長度比對，避免逐字元比較洩漏時間差資訊（內部小工具不算高風險目標，
// 但反正不費工夫，順手做對）。
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

function loginPage(pathname, error) {
  const errorHtml = error
    ? '<p style="color:#c0392b;font-size:14px;margin:0 0 14px;">密碼不對，再試一次。</p>'
    : '';
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>需要密碼</title>
<style>
  body{font-family:-apple-system,"Microsoft JhengHei",sans-serif;background:#f4f6f9;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .box{background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);
    padding:36px 32px;max-width:340px;width:90%;text-align:center;}
  h1{font-size:18px;margin:0 0 6px;color:#1a1a1a;}
  p.hint{color:#6b7280;font-size:13px;margin:0 0 20px;}
  input{width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;
    border-radius:8px;font-size:16px;margin-bottom:14px;text-align:center;letter-spacing:2px;}
  button{width:100%;padding:11px;border:0;border-radius:8px;background:#1a73e8;
    color:#fff;font-size:15px;font-weight:600;cursor:pointer;}
  button:hover{background:#1558b0;}
  .contact-link{display:block;margin-top:18px;font-size:13px;color:#6b7280;text-decoration:none;}
  .contact-link:hover{color:#1a73e8;text-decoration:underline;}
</style></head>
<body>
  <div class="box">
    <h1>內部商用工具</h1>
    <p class="hint">請輸入密碼才能繼續</p>
    ${errorHtml}
    <form method="POST" action="${pathname}">
      <input type="password" name="password" autofocus required>
      <button type="submit">進入</button>
    </form>
    <a class="contact-link" href="https://www.hunglun.com/contact" target="_blank" rel="noopener">需要使用權限？請洽鴻綸科技</a>
  </div>
</body></html>`;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!isProtected(url.pathname)) {
    return next();
  }

  if (!env.INTERNAL_TOOLS_PASSWORD) {
    console.error('缺少環境變數：INTERNAL_TOOLS_PASSWORD');
    return new Response('伺服器尚未設定密碼，請聯絡管理員。', { status: 503 });
  }

  const expectedHash = await sha256Hex(env.INTERNAL_TOOLS_PASSWORD);
  const cookieValue = getCookie(request, COOKIE_NAME);
  if (cookieValue && timingSafeEqual(cookieValue, expectedHash)) {
    return next();
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const input = String(form.get('password') || '');
    if (timingSafeEqual(input, env.INTERNAL_TOOLS_PASSWORD)) {
      const headers = new Headers({ Location: url.pathname });
      headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${expectedHash}; Path=/tools; HttpOnly; Secure; SameSite=Strict`
      );
      return new Response(null, { status: 302, headers });
    }
    return new Response(loginPage(url.pathname, true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(loginPage(url.pathname, false), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
