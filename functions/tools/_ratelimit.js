/**
 * 密碼登入的暴力猜測防護（Cloudflare KV，binding 名稱 ceu_ratelimit）。
 *
 * 為什麼要加：/tools/ceu（跟共用同一組密碼的 /tools/flex-deploy、/tools/downloads、
 * 以及 ceu.html 內建的 /tools/ceu/api/verify-password 二次確認)，原本密碼答錯
 * 沒有次數限制，理論上可以寫程式一直猜。這支只做一件事：同一個來源 IP 在時間窗內
 * 錯太多次就先擋一段時間，不影響答對的人。
 *
 * 不是防真正的國家級攻擊者（KV 不是強一致性，理論上能繞過），但足以擋掉一般的
 * 自動化猜測腳本，跟這個工具的風險等級相稱。
 *
 * KV 沒綁定（本機開發、或還沒建 namespace）時一律視為「沒被鎖」，不會讓功能整個掛掉，
 * 只是退回沒有這層防護的狀態。
 */

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 15 * 60; // 15 分鐘內錯滿 8 次

export function clientKey(request, scope) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `${scope}:${ip}`;
}

// true＝目前被鎖，不該再讓這個來源嘗試密碼。
export async function isLocked(kv, key) {
  if (!kv) return false;
  const raw = await kv.get(key);
  if (!raw) return false;
  const data = JSON.parse(raw);
  return data.count >= MAX_ATTEMPTS;
}

export async function recordFailure(kv, key) {
  if (!kv) return;
  const raw = await kv.get(key);
  const count = raw ? JSON.parse(raw).count + 1 : 1;
  await kv.put(key, JSON.stringify({ count }), { expirationTtl: WINDOW_SECONDS });
}

export async function clearFailures(kv, key) {
  if (!kv) return;
  await kv.delete(key);
}
