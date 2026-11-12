export interface MountInfo {
  id: string;
  name: string;
  path: string;
  kind: 'gdrive-desktop' | 'local';
  createdAt: string;
}

export interface DetectedMountInfo {
  name: string;
  path: string;
  kind: 'gdrive-desktop' | 'local';
  alreadyMounted: boolean;
}

export interface MountBrowseEntry {
  name: string;
  path: string;
  isFolder: boolean;
  kind?: 'image' | 'video';
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

import { t } from '../i18n';

export interface GDriveStatus {
  connected: boolean;
  hasCredentials: boolean;
  clientId?: string;
  redirectUri?: string;
  defaultRedirectUri?: string;
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

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text);
    }
  }
  if (!res.ok) {
    const errMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : t('api.requestFailed', { status: res.status });
    throw new Error(errMsg);
  }
  return data as T;
}

export async function fetchMounts(): Promise<{
  mounts: MountInfo[];
  detected: DetectedMountInfo[];
}> {
  return apiJson('/api/mounts');
}

export async function createMount(path: string, name?: string): Promise<MountInfo> {
  const data = await apiJson<{ mount: MountInfo }>('/api/mounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, name }),
  });
  return data.mount;
}

export async function deleteMount(id: string): Promise<void> {
  await apiJson(`/api/mounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function browseMountDir(
  mountId: string,
  path = '',
  q = ''
): Promise<{ mount: MountInfo; currentPath: string; entries: MountBrowseEntry[] }> {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  if (q) params.set('q', q);
  return apiJson(`/api/mounts/${encodeURIComponent(mountId)}/browse?${params.toString()}`);
}

export function getMountStreamUrl(mountId: string, relPath: string): string {
  const params = new URLSearchParams({ path: relPath });
  return `/api/mounts/${encodeURIComponent(mountId)}/stream?${params.toString()}`;
}

export async function fetchGDriveStatus(): Promise<GDriveStatus> {
  return apiJson('/api/gdrive/status');
}

export async function saveGDriveCreds(
  clientId: string,
  clientSecret: string,
  redirectUri?: string
): Promise<GDriveStatus> {
  return apiJson('/api/gdrive/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, redirectUri }),
  });
}

export async function fetchGDriveAuthUrl(): Promise<{ url: string; redirectUri: string }> {
  return apiJson('/api/gdrive/auth/url');
}

export async function connectGDriveToken(
  accessToken: string,
  refreshToken?: string
): Promise<GDriveStatus> {
  return apiJson('/api/gdrive/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
}

export async function disconnectGDriveAccount(): Promise<GDriveStatus> {
  return apiJson('/api/gdrive/disconnect', { method: 'POST' });
}

export async function fetchGDriveFiles(options: {
  folderId?: string;
  view?: 'my-drive' | 'shared' | 'all-media';
  pageToken?: string;
  q?: string;
}): Promise<{ files: GDriveFileItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  if (options.folderId) params.set('folderId', options.folderId);
  if (options.view) params.set('view', options.view);
  if (options.pageToken) params.set('pageToken', options.pageToken);
  if (options.q) params.set('q', options.q);
  return apiJson(`/api/gdrive/files?${params.toString()}`);
}

export function getGDriveStreamUrl(fileId: string): string {
  return `/api/gdrive/stream/${encodeURIComponent(fileId)}`;
}

