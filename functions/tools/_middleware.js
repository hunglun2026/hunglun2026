/**
 * /tools 底下商用工具＋研習專區的密碼保護（Cloudflare Pages Functions middleware）
 *
 * 為什麼要做成伺服器端驗證，而不是像 tools/ceu.html 內部那樣把密碼寫成前端 JS
 * 常數：常數寫法只要看網頁原始碼（View Source）就能直接讀到密碼，等於沒鎖。
 * 這支中介層攔在靜態檔案被送出去之前檢查身分，密碼本身完全不會出現在送到
 * 瀏覽器的 HTML／JS 裡。
 *
 * 兩套獨立的保護邏輯，互不相干：
 * 1. TOOL_GROUPS 列出的商用工具（ceu / flex-deploy＋downloads）：每組各自一把密碼、
 *    各自的 cookie，互不通用——答對 ceu 的密碼不能拿去開 flex-deploy，反之亦然
 *    （Steve 2026-09-24：ceu 單獨換成自己的密碼，跟其他商用工具分開）。
 *    15 分鐘 cookie。tools/mail 等既有免費工具不受影響。
 * 2. /tools/training（研習專區）：每篇講義各自一組密碼＋共用講師萬用密碼，密碼清單
 *    在 ./training/_topics.js 跟 ../go/_sessions.js，30 天 cookie（跟第 1 套 15 分鐘
 *    刻意不同，研習教材是自己找時間看，不是看完馬上關掉）。
 *    2026-09-20 起專區「首頁」改成公開：辦過哪些場次是對外的實績證明，鎖起來等於
 *    讓搜尋引擎與 AI 問答引擎查不到，實際要保護的是講義內容本身。
 *
 * 需要的環境變數（Cloudflare Pages 專案 → 設定 → 環境變數設定，Production 與
 * Preview 都要，只影響第 1 套邏輯）：
 *   CEU_TOOLS_PASSWORD        /tools/ceu 專用密碼
 *   INTERNAL_TOOLS_PASSWORD   /tools/flex-deploy、/tools/downloads 共用密碼
 * 沒設的話那一組會直接回 503，不會讓任何人繞過去；第 2 套（研習專區）不受影響。
 *
 * 第 1 套另外搭配 KV binding「ceu_ratelimit」（Steve 2026-09-24 建立，已綁定
 * Production／Preview）做暴力猜密碼防護，見 ./_ratelimit.js；每組用自己的
 * rate-limit scope（ceu／tools），/tools/ceu/api/verify-password 那邊用的是
 * 跟 ceu 這組同一個 scope，避免留一條繞過鎖定的路。
 * 沒綁 KV 時 isLocked 一律回 false，不影響原本的密碼驗證邏輯。
 */
import { MASTER_PASSWORD } from '../go/_sessions.js';
import { TOPIC_PASSWORDS } from './training/_topics.js';
import { clientKey, isLocked, recordFailure, clearFailures } from './_ratelimit.js';

// 下載檔用繁體中文檔名，瀏覽器網址列會把它編碼成 %E9%83%A8... 這種形式，
// 所以比對前一律要 decodeURIComponent 還原成這裡寫的原文才比得對。
// /tools/downloads 整個資料夾都保護，不逐一列檔名——四份部署手冊＋zip
// 都放在這底下，之後再加新檔案不用記得回來改這裡。
const TOOL_GROUPS = [
  { paths: ['/tools/ceu'], envVar: 'CEU_TOOLS_PASSWORD', cookieName: 'hlt_ceu_auth', cookiePath: '/tools/ceu', rlScope: 'ceu' },
  { paths: ['/tools/flex-deploy', '/tools/downloads'], envVar: 'INTERNAL_TOOLS_PASSWORD', cookieName: 'hlt_tools_auth', cookiePath: '/tools', rlScope: 'tools' },
];
const MAX_AGE = 60 * 15; // 15 分鐘

const TRAINING_BASE = '/tools/training';
const TRAINING_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function findGroup(pathname) {
  return TOOL_GROUPS.find((g) => g.paths.some((p) => pathname === p || pathname.startsWith(p + '/')));
}

// null＝不是研習專區的路徑；''＝首頁本身；其他＝講義的 slug（例如 'vibe-coding'）
function trainingSlug(pathname) {
  if (pathname === TRAINING_BASE || pathname === TRAINING_BASE + '/') return '';
  if (pathname.startsWith(TRAINING_BASE + '/')) {
    return pathname.slice(TRAINING_BASE.length + 1).split('/')[0];
  }
  return null;
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

function lockedPage() {
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>暫時鎖定</title>
<style>
  body{font-family:-apple-system,"Microsoft JhengHei",sans-serif;background:#f4f6f9;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}
  .box{background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);
    padding:36px 32px;max-width:360px;width:100%;text-align:center;box-sizing:border-box;}
  h1{font-size:18px;margin:0 0 6px;color:#1a1a1a;}
  p{color:#6b7280;font-size:13px;margin:0;}
</style></head>
<body>
  <div class="box">
    <h1>密碼錯誤次數過多</h1>
    <p>這個來源已暫時鎖定，請稍後（約 15 分鐘）再試一次；急用請聯絡管理員。</p>
  </div>
</body></html>`;
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

function trainingLoginPage(pathname, error) {
  const errorHtml = error
    ? '<p style="color:#c0392b;font-size:14px;margin:0 0 14px;">密碼不對，再試一次。</p>'
    : '';
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>研習專區：需要密碼</title>
<style>
  body{font-family:-apple-system,"Microsoft JhengHei",sans-serif;background:#f4f6f9;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}
  .box{background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);
    padding:36px 32px;max-width:360px;width:100%;text-align:center;box-sizing:border-box;}
  h1{font-size:18px;margin:0 0 6px;color:#1a1a1a;}
  p.hint{color:#6b7280;font-size:13px;margin:0 0 20px;}
  input{width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;
    border-radius:8px;font-size:16px;margin-bottom:14px;text-align:center;letter-spacing:2px;}
  button{width:100%;padding:11px;border:0;border-radius:8px;background:#1a73e8;
    color:#fff;font-size:15px;font-weight:600;cursor:pointer;}
  button:hover{background:#1558b0;}
</style></head>
<body>
  <div class="box">
    <h1>研習專區</h1>
    <p class="hint">請輸入研習現場公佈的密碼</p>
    ${errorHtml}
    <form method="POST" action="${pathname}">
      <input type="text" name="password" autofocus required inputmode="text">
      <button type="submit">進入</button>
    </form>
  </div>
</body></html>`;
}

async function handleTraining({ request, next }, pathname, slug) {
  const validPasswords = [MASTER_PASSWORD, ...(TOPIC_PASSWORDS[slug] ? [TOPIC_PASSWORDS[slug]] : [])];
  const expectedHashes = await Promise.all(validPasswords.map(sha256Hex));
  const cookieName = `hlt_training_${slug || 'index'}`;

  const cookieValue = getCookie(request, cookieName);
  if (cookieValue && expectedHashes.some((h) => timingSafeEqual(cookieValue, h))) {
    return next();
  }

  const url = new URL(request.url);
  if (request.method === 'POST') {
    const form = await request.formData();
    const input = String(form.get('password') || '');
    const matchedHash = validPasswords.find((p) => timingSafeEqual(input, p));
    if (matchedHash !== undefined) {
      const setHash = await sha256Hex(matchedHash);
      const response = await next(new Request(url.toString(), { method: 'GET' }));
      const headers = new Headers(response.headers);
      headers.append(
        'Set-Cookie',
        `${cookieName}=${setHash}; Path=${TRAINING_BASE}; Max-Age=${TRAINING_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`
      );
      return new Response(response.body, { status: response.status, headers });
    }
    return new Response(trainingLoginPage(pathname, true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(trainingLoginPage(pathname, false), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);

  // slug 為 '' 代表研習專區首頁：2026-09-20 起改成公開，讓辦過哪些場次這項實績
  // 能被搜尋引擎與 AI 問答引擎查得到。各篇講義（slug 非空）維持密碼保護不變。
  const slug = trainingSlug(pathname);
  if (slug) {
    return handleTraining({ request, next }, pathname, slug);
  }

  const group = findGroup(pathname);
  if (!group) {
    return next();
  }

  const password = env[group.envVar];
  if (!password) {
    console.error(`缺少環境變數：${group.envVar}`);
    return new Response('伺服器尚未設定密碼，請聯絡管理員。', { status: 503 });
  }

  const expectedHash = await sha256Hex(password);
  const cookieValue = getCookie(request, group.cookieName);
  if (cookieValue && timingSafeEqual(cookieValue, expectedHash)) {
    return next();
  }

  const rlKey = clientKey(request, group.rlScope);
  if (await isLocked(env.ceu_ratelimit, rlKey)) {
    return new Response(lockedPage(), {
      status: 429,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const input = String(form.get('password') || '');
    if (timingSafeEqual(input, password)) {
      await clearFailures(env.ceu_ratelimit, rlKey);
      // 密碼對了：把這次 POST 換成一個乾淨的 GET 丟給下一棒去拿真正的檔案內容
      // （html 頁面或 zip）當回應體，再把 15 分鐘效期的 cookie 掛上去。
      const response = await next(new Request(url.toString(), { method: 'GET' }));
      const headers = new Headers(response.headers);
      headers.append(
        'Set-Cookie',
        `${group.cookieName}=${expectedHash}; Path=${group.cookiePath}; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`
      );
      return new Response(response.body, { status: response.status, headers });
    }
    await recordFailure(env.ceu_ratelimit, rlKey);
    return new Response(loginPage(pathname, true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(loginPage(pathname, false), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
