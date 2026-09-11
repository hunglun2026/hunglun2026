/**
 * /tools 底下商用工具的密碼保護（Cloudflare Pages Functions middleware）
 *
 * 為什麼要做成伺服器端驗證，而不是像 tools/ceu.html 內部那樣把密碼寫成前端 JS
 * 常數：常數寫法只要看網頁原始碼（View Source）就能直接讀到密碼，等於沒鎖。
 * 這支中介層攔在靜態檔案被送出去之前檢查身分，密碼本身完全不會出現在送到
 * 瀏覽器的 HTML／JS 裡。
 *
 * 只保護下面 PROTECTED_PATHS 列出的路徑，tools/mail 等既有免費工具不受影響。
 *
 * 刻意不用 cookie（Steve 2026-09-11 要求）：每一次請求都要重新輸入密碼，
 * 瀏覽器不記住任何登入狀態。代價是 flex-deploy.html 裡的下載按鈕也要再輸入
 * 一次密碼（它是獨立的受保護路徑，跟看手冊頁面是兩次驗證，見該檔案 .dl-form）。
 * 做法：POST 密碼答對後不發 cookie、不用 302 轉址，直接在這次回應裡把原本
 * 該回傳的靜態內容（html 頁面或 zip 檔）組成一個 GET 請求丟給 next()，
 * 由它去讀真正的檔案內容當作這次 POST 的回應本體。
 *
 * 需要的環境變數（Cloudflare Pages 專案 → 設定 → 環境變數設定，Production 與
 * Preview 都要）：
 *   INTERNAL_TOOLS_PASSWORD   同事登入這幾個商用工具頁面要輸入的密碼
 * 沒設的話這支會直接回 503，不會讓任何人繞過去。
 */

const PROTECTED_PATHS = ['/tools/ceu', '/tools/flex-deploy', '/tools/downloads/flex-deploy-tool.zip'];

function isProtected(pathname) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// 固定長度比對，避免逐字元比較洩漏時間差資訊（內部小工具不算高風險目標，
// 但反正不費工夫，順手做對）。
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

  if (request.method === 'POST') {
    const form = await request.formData();
    const input = String(form.get('password') || '');
    if (timingSafeEqual(input, env.INTERNAL_TOOLS_PASSWORD)) {
      // 密碼對了，不發 cookie，直接把這次 POST 換成一個乾淨的 GET 丟給下一棒去拿
      // 真正的檔案內容（html 頁面或 zip）當回應體，這樣使用者不用被轉址、也不會
      // 留下任何登入紀錄。不沿用原本 POST 的 headers，避免帶著沒有意義的
      // Content-Type／Content-Length 混進一個沒有 body 的 GET 請求。
      return next(new Request(url.toString(), { method: 'GET' }));
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
