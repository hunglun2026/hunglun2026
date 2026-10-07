/**
 * /tools/downloads 底下「超過 Pages 單檔 25MB 上限」的大檔下載。
 *
 * 檔案本體放在 R2（bucket flex-deploy-mirror），這裡在伺服器端轉送給使用者。
 * 密碼檢查由 ../_middleware.js 先做（/tools/downloads 整個資料夾都保護），
 * 走到這裡的一定已經登入。
 *
 * R2 的真實網址放 Pages 密鑰（不進 repo）：這個 repo 是公開的，網址寫在這裡
 * 等於任何人都能繞過密碼直接下載。
 *   FLEX_FULL_URL   flex-full.zip：一鍵轉換檔模擬版＋正式版＋Google FRD 套件＋記錄器（約 1GB），
 *                   解壓縮後不用再上網下載
 *
 * 其他檔名一律 next()，交回給靜態檔案（例如 Flex部署工具包.zip、Word 說明書）。
 */
const BIG_FILES = {
  'flex-full.zip': 'FLEX_FULL_URL',
};

export async function onRequest({ params, env, next }) {
  const envVar = BIG_FILES[params.name];
  if (!envVar) return next();

  const src = env[envVar];
  if (!src) return new Response('伺服器尚未設定這個檔案，請聯絡管理員。', { status: 503 });

  const upstream = await fetch(src);
  if (!upstream.ok) return new Response('檔案暫時無法下載，請聯絡管理員。', { status: 502 });

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${params.name}"`);
  headers.set('Cache-Control', 'private, no-store');
  const len = upstream.headers.get('Content-Length');
  if (len) headers.set('Content-Length', len);
  return new Response(upstream.body, { status: 200, headers });
}
