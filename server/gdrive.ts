import { loadConfig, updateConfig, type GDriveTokens } from './config.ts';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export interface GDriveStatus {
  connected: boolean;
  hasCredentials: boolean;
  clientId?: string;
  redirectUri?: string;
  email?: string;
  displayName?: string;
  photoLink?: string;
}

export interface GDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  kind?: 'image' | 'video';
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
}

export function getGDriveStatus(): GDriveStatus {
  const cfg = loadConfig();
  const hasCredentials = Boolean(cfg.gdriveCredentials?.clientId && cfg.gdriveCredentials?.clientSecret);
  const connected = Boolean(cfg.gdriveTokens?.accessToken || cfg.gdriveTokens?.refreshToken);

  return {
    connected,
    hasCredentials,
    clientId: cfg.gdriveCredentials?.clientId,
    redirectUri: cfg.gdriveCredentials?.redirectUri,
    email: cfg.gdriveTokens?.email,
    displayName: cfg.gdriveTokens?.displayName,
    photoLink: cfg.gdriveTokens?.photoLink,
  };
}

export function saveGDriveCredentials(
  clientId: string,
  clientSecret: string,
  redirectUri?: string
): GDriveStatus {
  updateConfig((cfg) => ({
    ...cfg,
    gdriveCredentials: {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: redirectUri?.trim() || undefined,
    },
  }));
  return getGDriveStatus();
}

export function resolveRedirectUri(origin: string): string {
  const cfg = loadConfig();
  if (cfg.gdriveCredentials?.redirectUri) {
    return cfg.gdriveCredentials.redirectUri;
  }
  return `${origin.replace(/\/+$/, '')}/api/gdrive/auth/callback`;
}

export function buildGDriveAuthUrl(origin: string): string {
  const cfg = loadConfig();
  const creds = cfg.gdriveCredentials;
  if (!creds?.clientId || !creds?.clientSecret) {
    throw new Error('请先配置 Google OAuth Client ID 和 Client Secret');
  }

  const redirectUri = resolveRedirectUri(origin);
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function fetchDriveUserProfile(accessToken: string): Promise<{
  email?: string;
  displayName?: string;
  photoLink?: string;
}> {
  try {
    const res = await fetch(`${DRIVE_API_BASE}/about?fields=user(displayName,emailAddress,photoLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      user?: { displayName?: string; emailAddress?: string; photoLink?: string };
    };
    return {
      email: data.user?.emailAddress,
      displayName: data.user?.displayName,
      photoLink: data.user?.photoLink,
    };
  } catch {
    return {};
  }
}

export async function exchangeGDriveCode(code: string, origin: string): Promise<GDriveStatus> {
  const cfg = loadConfig();
  const creds = cfg.gdriveCredentials;
  if (!creds?.clientId || !creds?.clientSecret) {
    throw new Error('缺少 Google OAuth 凭据');
  }

  const redirectUri = resolveRedirectUri(origin);
  const body = new URLSearchParams({
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth 换取 Token 失败 (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const profile = await fetchDriveUserProfile(tokenData.access_token);
  const tokens: GDriveTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? cfg.gdriveTokens?.refreshToken,
    expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
    ...profile,
  };

  updateConfig((current) => ({ ...current, gdriveTokens: tokens }));
  return getGDriveStatus();
}

export async function connectWithManualToken(
  accessToken: string,
  refreshToken?: string
): Promise<GDriveStatus> {
  const cleanAccess = accessToken.trim();
  if (!cleanAccess) {
    throw new Error('Access Token 不能为空');
  }

  const profile = await fetchDriveUserProfile(cleanAccess);
  const tokens: GDriveTokens = {
    accessToken: cleanAccess,
    refreshToken: refreshToken?.trim() || undefined,
    ...profile,
  };

  updateConfig((current) => ({ ...current, gdriveTokens: tokens }));
  return getGDriveStatus();
}

export function disconnectGDrive(): GDriveStatus {
  updateConfig((cfg) => ({
    ...cfg,
    gdriveTokens: undefined,
  }));
  return getGDriveStatus();
}

async function refreshAccessToken(): Promise<string> {
  const cfg = loadConfig();
  const creds = cfg.gdriveCredentials;
  const refreshToken = cfg.gdriveTokens?.refreshToken;
  if (!creds?.clientId || !creds?.clientSecret || !refreshToken) {
    throw new Error('Google Drive 授权已过期，请重新连接');
  }

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`刷新 Google Drive Token 失败: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  updateConfig((current) => ({
    ...current,
    gdriveTokens: {
      ...(current.gdriveTokens ?? { accessToken: data.access_token }),
      accessToken: data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    },
  }));

  return data.access_token;
}

async function ensureAccessToken(forceRefresh = false): Promise<string> {
  const cfg = loadConfig();
  const tokens = cfg.gdriveTokens;
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    throw new Error('尚未连接 Google Drive');
  }

  const isExpired = tokens.expiresAt ? Date.now() > tokens.expiresAt - 60_000 : false;
  if (forceRefresh || !tokens.accessToken || isExpired) {
    if (tokens.refreshToken && cfg.gdriveCredentials) {
      return await refreshAccessToken();
    }
    if (!tokens.accessToken) {
      throw new Error('Google Drive 授权已过期，请重新连接');
    }
  }

  return tokens.accessToken;
}

async function driveFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await ensureAccessToken(false);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && retry) {
    const cfg = loadConfig();
    if (cfg.gdriveTokens?.refreshToken && cfg.gdriveCredentials) {
      const freshToken = await ensureAccessToken(true);
      headers.set('Authorization', `Bearer ${freshToken}`);
      return fetch(url, { ...init, headers });
    }
  }
  return res;
}

function escapeDriveQuery(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function listGDriveFiles(options: {
  folderId?: string;
  view?: 'my-drive' | 'shared' | 'all-media';
  pageToken?: string;
  query?: string;
}): Promise<{ files: GDriveFileItem[]; nextPageToken?: string }> {
  const view = options.view ?? 'my-drive';
  const folderId = options.folderId || 'root';
  const search = options.query?.trim();

  const clauses: string[] = ['trashed = false'];
  const mediaOrFolderFilter =
    "(mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'image/' or mimeType contains 'video/')";

  if (view === 'all-media') {
    clauses.push("(mimeType contains 'image/' or mimeType contains 'video/')");
  } else if (view === 'shared') {
    clauses.push('sharedWithMe = true');
    clauses.push(mediaOrFolderFilter);
  } else {
    clauses.push(`'${escapeDriveQuery(folderId)}' in parents`);
    clauses.push(mediaOrFolderFilter);
  }

  if (search) {
    clauses.push(`name contains '${escapeDriveQuery(search)}'`);
  }

  const params = new URLSearchParams({
    q: clauses.join(' and '),
    pageSize: '100',
    orderBy: 'folder,name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    fields:
      'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,videoMediaMetadata,imageMediaMetadata)',
  });

  if (options.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  const res = await driveFetch(`${DRIVE_API_BASE}/files?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取 Google Drive 文件列表失败 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    nextPageToken?: string;
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      thumbnailLink?: string;
      videoMediaMetadata?: { width?: number; height?: number };
      imageMediaMetadata?: { width?: number; height?: number };
    }>;
  };

  const files: GDriveFileItem[] = (data.files ?? []).map((f) => {
    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
    const kind = f.mimeType.startsWith('video/')
      ? 'video'
      : f.mimeType.startsWith('image/')
        ? 'image'
        : undefined;
    const dims = f.videoMediaMetadata ?? f.imageMediaMetadata;

    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      isFolder,
      kind,
      size: f.size ? Number(f.size) : undefined,
      modifiedTime: f.modifiedTime,
      thumbnailLink: f.thumbnailLink,
      width: dims?.width,
      height: dims?.height,
    };
  });

  return { files, nextPageToken: data.nextPageToken };
}

export async function streamGDriveFile(req: Request, fileId: string): Promise<Response> {
  const upstreamUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const headers: Record<string, string> = {};
  const range = req.headers.get('range');
  if (range) {
    headers['Range'] = range;
  }

  let upstream: Response;
  try {
    upstream = await driveFetch(upstreamUrl, { headers });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Google Drive auth error', {
      status: 401,
    });
  }

  if (!upstream.ok && upstream.status !== 206) {
    const errText = await upstream.text();
    return new Response(`Google Drive stream error (${upstream.status}): ${errText}`, {
      status: upstream.status,
    });
  }

  const respHeaders = new Headers();
  const passthroughHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ];
  for (const h of passthroughHeaders) {
    const val = upstream.headers.get(h);
    if (val) respHeaders.set(h, val);
  }
  if (!respHeaders.has('accept-ranges')) {
    respHeaders.set('accept-ranges', 'bytes');
  }
  respHeaders.set('Access-Control-Allow-Origin', '*');
  respHeaders.set('Cache-Control', 'private, max-age=300');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

