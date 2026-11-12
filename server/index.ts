import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  addMount,
  browseMount,
  detectGoogleDrivePaths,
  listMounts,
  removeMount,
  streamMountFile,
} from './localMounts.ts';
import {
  buildGDriveAuthUrl,
  connectWithManualToken,
  disconnectGDrive,
  exchangeGDriveCode,
  getGDriveStatus,
  listGDriveFiles,
  resolveRedirectUri,
  saveGDriveCredentials,
  streamGDriveFile,
} from './gdrive.ts';

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || (isProd ? 3000 : 3001));
const distDir = resolve(process.cwd(), 'dist');

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getRequestOrigin(req: Request, url: URL): string {
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

function oauthResultHtml(success: boolean, message: string): Response {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Google Drive 授权</title>
  <style>
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#07090e; color:#f1f5f9; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; }
    .card { background:#0f172a; border:1px solid rgba(148,163,184,0.2); border-radius:16px; padding:28px 32px; max-width:420px; }
    h2 { margin:0 0 10px; color:${success ? '#38bdf8' : '#f87171'}; }
    p { margin:0 0 18px; color:#94a3b8; font-size:14px; line-height:1.5; }
    button { background:#38bdf8; color:#04111d; border:none; padding:9px 18px; border-radius:8px; font-weight:600; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${success ? 'Google Drive 已连接' : 'Google Drive 授权失败'}</h2>
    <p>${message}</p>
    <button onclick="window.close()">关闭窗口</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'vrviewer-gdrive-oauth', success: ${success} }, '*');
    }
    ${success ? 'setTimeout(() => window.close(), 1200);' : ''}
  </script>
</body>
</html>`;
  return new Response(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleApi(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = req.method.toUpperCase();

  try {
    if (method === 'GET' && path === '/api/health') {
      return json({ ok: true, runtime: 'bun', version: Bun.version });
    }

    // --- Local & Google Drive Desktop Mounts ---
    if (method === 'GET' && path === '/api/mounts') {
      return json({
        mounts: listMounts(),
        detected: detectGoogleDrivePaths(),
      });
    }

    if (method === 'POST' && path === '/api/mounts') {
      const body = (await req.json()) as { path?: string; name?: string };
      if (!body.path?.trim()) {
        return json({ error: '请提供目录路径' }, 400);
      }
      const mount = addMount(body.path, body.name);
      return json({ mount });
    }

    const mountMatch = /^\/api\/mounts\/([^/]+)(?:\/(browse|stream))?$/.exec(path);
    if (mountMatch) {
      const mountId = decodeURIComponent(mountMatch[1]);
      const action = mountMatch[2];

      if (method === 'DELETE' && !action) {
        const ok = removeMount(mountId);
        return json({ ok });
      }
      if (method === 'GET' && action === 'browse') {
        const relPath = url.searchParams.get('path') || '';
        const q = url.searchParams.get('q') || '';
        return json(browseMount(mountId, relPath, q));
      }
      if (method === 'GET' && action === 'stream') {
        const relPath = url.searchParams.get('path') || '';
        return streamMountFile(req, mountId, relPath);
      }
    }

    // --- Google Drive Cloud API ---
    if (method === 'GET' && path === '/api/gdrive/status') {
      const origin = getRequestOrigin(req, url);
      return json({
        ...getGDriveStatus(),
        defaultRedirectUri: resolveRedirectUri(origin),
      });
    }

    if (method === 'POST' && path === '/api/gdrive/credentials') {
      const body = (await req.json()) as {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
      };
      if (!body.clientId?.trim() || !body.clientSecret?.trim()) {
        return json({ error: 'Client ID 和 Client Secret 不能为空' }, 400);
      }
      const status = saveGDriveCredentials(body.clientId, body.clientSecret, body.redirectUri);
      return json(status);
    }

    if (method === 'GET' && path === '/api/gdrive/auth/url') {
      const origin = getRequestOrigin(req, url);
      return json({
        url: buildGDriveAuthUrl(origin),
        redirectUri: resolveRedirectUri(origin),
      });
    }

    if (method === 'GET' && path === '/api/gdrive/auth/callback') {
      const err = url.searchParams.get('error');
      if (err) {
        return oauthResultHtml(false, `Google 返回错误：${err}`);
      }
      const code = url.searchParams.get('code');
      if (!code) {
        return oauthResultHtml(false, '未收到授权码 (code)。');
      }
      const origin = getRequestOrigin(req, url);
      const status = await exchangeGDriveCode(code, origin);
      return oauthResultHtml(
        true,
        `已成功连接账号 ${status.email || status.displayName || ''}，正在返回 VRViewer…`
      );
    }

    if (method === 'POST' && path === '/api/gdrive/token') {
      const body = (await req.json()) as { accessToken?: string; refreshToken?: string };
      if (!body.accessToken?.trim()) {
        return json({ error: 'Access Token 不能为空' }, 400);
      }
      const status = await connectWithManualToken(body.accessToken, body.refreshToken);
      return json(status);
    }

    if (method === 'POST' && path === '/api/gdrive/disconnect') {
      return json(disconnectGDrive());
    }

    if (method === 'GET' && path === '/api/gdrive/files') {
      const folderId = url.searchParams.get('folderId') || 'root';
      const view = (url.searchParams.get('view') || 'my-drive') as
        | 'my-drive'
        | 'shared'
        | 'all-media';
      const pageToken = url.searchParams.get('pageToken') || undefined;
      const query = url.searchParams.get('q') || undefined;
      const result = await listGDriveFiles({ folderId, view, pageToken, query });
      return json(result);
    }

    const streamMatch = /^\/api\/gdrive\/stream\/([^/]+)$/.exec(path);
    if (method === 'GET' && streamMatch) {
      const fileId = decodeURIComponent(streamMatch[1]);
      return await streamGDriveFile(req, fileId);
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : '服务器内部错误';
    return json({ error: message }, 500);
  }
}

function serveStatic(url: URL): Response {
  if (!existsSync(distDir)) {
    return new Response(
      'VRViewer Bun server is running. Run `bun run build` first or use `bun run dev`.',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  let relPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!relPath) relPath = 'index.html';

  const candidate = resolve(distDir, relPath);
  if (candidate.startsWith(distDir) && existsSync(candidate) && statSync(candidate).isFile()) {
    return new Response(Bun.file(candidate));
  }

  const indexHtml = join(distDir, 'index.html');
  if (existsSync(indexHtml)) {
    return new Response(Bun.file(indexHtml), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

const server = Bun.serve({
  port,
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(req, url);
    }
    return serveStatic(url);
  },
});

console.log(`[VRViewer Bun Server] Listening on http://localhost:${server.port} (${isProd ? 'production' : 'api'})`);

