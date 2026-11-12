import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { loadConfig, updateConfig, type MountConfig } from './config.ts';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi', '.ogv']);

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
};

export interface DetectedMount {
  name: string;
  path: string;
  kind: 'gdrive-desktop' | 'local';
  alreadyMounted: boolean;
}

export interface MountBrowseEntry {
  name: string;
  path: string; // relative to mount root, forward slashes
  isFolder: boolean;
  kind?: 'image' | 'video';
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

export function expandHome(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (trimmed === '~') return homedir();
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return join(homedir(), trimmed.slice(2));
  }
  return resolve(trimmed);
}

export function getMediaKindFromExt(filename: string): 'image' | 'video' | null {
  const ext = extname(filename).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return null;
}

export function getMimeFromExt(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export function detectGoogleDrivePaths(): DetectedMount[] {
  const existing = new Set(loadConfig().mounts.map((m) => resolve(m.path)));
  const candidates: DetectedMount[] = [];

  const cloudStorage = join(homedir(), 'Library', 'CloudStorage');
  if (existsSync(cloudStorage)) {
    try {
      for (const entry of readdirSync(cloudStorage, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (/google\s*drive/i.test(entry.name)) {
          const full = join(cloudStorage, entry.name);
          const myDrive = join(full, 'My Drive');
          const targetPath = existsSync(myDrive) ? myDrive : full;
          candidates.push({
            name: entry.name.replace(/^GoogleDrive-/, 'Google Drive · '),
            path: targetPath,
            kind: 'gdrive-desktop',
            alreadyMounted: existing.has(resolve(targetPath)) || existing.has(resolve(full)),
          });
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  const volumesDir = '/Volumes';
  if (existsSync(volumesDir)) {
    try {
      for (const entry of readdirSync(volumesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (/google\s*drive|gdrive/i.test(entry.name)) {
          const full = join(volumesDir, entry.name);
          candidates.push({
            name: entry.name,
            path: full,
            kind: 'gdrive-desktop',
            alreadyMounted: existing.has(resolve(full)),
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  return candidates;
}

export function listMounts(): MountConfig[] {
  return loadConfig().mounts;
}

export function addMount(rawPath: string, customName?: string): MountConfig {
  const resolvedPath = expandHome(rawPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`目录不存在：${resolvedPath}`);
  }
  const st = statSync(resolvedPath);
  if (!st.isDirectory()) {
    throw new Error(`路径不是文件夹：${resolvedPath}`);
  }

  const current = loadConfig();
  const duplicate = current.mounts.find((m) => resolve(m.path) === resolvedPath);
  if (duplicate) {
    return duplicate;
  }

  const isGDrive = /google\s*drive|gdrive/i.test(resolvedPath);
  const mount: MountConfig = {
    id: `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: customName?.trim() || basename(resolvedPath) || resolvedPath,
    path: resolvedPath,
    kind: isGDrive ? 'gdrive-desktop' : 'local',
    createdAt: new Date().toISOString(),
  };

  updateConfig((cfg) => ({
    ...cfg,
    mounts: [...cfg.mounts, mount],
  }));

  return mount;
}

export function removeMount(id: string): boolean {
  let removed = false;
  updateConfig((cfg) => {
    const next = cfg.mounts.filter((m) => m.id !== id);
    removed = next.length !== cfg.mounts.length;
    return { ...cfg, mounts: next };
  });
  return removed;
}

function resolveSafeMountPath(mount: MountConfig, relPath: string): string {
  const root = resolve(mount.path);
  const cleaned = relPath.replace(/^\/+/, '');
  const target = resolve(root, cleaned);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('非法路径访问');
  }
  return target;
}

export function browseMount(
  mountId: string,
  relPath = '',
  searchQuery = ''
): { mount: MountConfig; currentPath: string; entries: MountBrowseEntry[] } {
  const mount = loadConfig().mounts.find((m) => m.id === mountId);
  if (!mount) {
    throw new Error('未找到指定的挂载目录');
  }

  const targetDir = resolveSafeMountPath(mount, relPath);
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    throw new Error(`目录不存在：${relPath || mount.path}`);
  }

  const root = resolve(mount.path);
  const normalizedCurrent = relative(root, targetDir).split(sep).join('/');
  const q = searchQuery.trim().toLowerCase();

  const dirents = readdirSync(targetDir, { withFileTypes: true });
  const entries: MountBrowseEntry[] = [];

  for (const d of dirents) {
    if (d.name.startsWith('.')) continue;
    if (q && !d.name.toLowerCase().includes(q)) continue;

    const full = join(targetDir, d.name);
    let isDir = d.isDirectory();
    if (d.isSymbolicLink()) {
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
    }

    const rel = relative(root, full).split(sep).join('/');
    if (isDir) {
      entries.push({
        name: d.name,
        path: rel,
        isFolder: true,
        mimeType: 'inode/directory',
      });
      continue;
    }

    const kind = getMediaKindFromExt(d.name);
    if (!kind) continue;

    try {
      const st = statSync(full);
      entries.push({
        name: d.name,
        path: rel,
        isFolder: false,
        kind,
        mimeType: getMimeFromExt(d.name),
        size: st.size,
        modifiedTime: st.mtime.toISOString(),
      });
    } catch {
      // Skip unreadable file
    }
  }

  entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
  });

  return { mount, currentPath: normalizedCurrent, entries };
}

export function streamMountFile(req: Request, mountId: string, relPath: string): Response {
  const mount = loadConfig().mounts.find((m) => m.id === mountId);
  if (!mount) {
    return new Response('Mount not found', { status: 404 });
  }

  let fullPath: string;
  try {
    fullPath = resolveSafeMountPath(mount, relPath);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }

  if (!existsSync(fullPath)) {
    return new Response('File not found', { status: 404 });
  }

  const st = statSync(fullPath);
  if (!st.isFile()) {
    return new Response('Not a file', { status: 400 });
  }

  const file = Bun.file(fullPath);
  const totalSize = st.size;
  const contentType = getMimeFromExt(fullPath);
  const rangeHeader = req.headers.get('range');

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, max-age=3600',
  };

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match) {
      return new Response('Invalid Range', {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const startStr = match[1];
    const endStr = match[2];
    let start: number;
    let end: number;

    if (startStr === '' && endStr !== '') {
      const suffix = Number(endStr);
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else {
      start = startStr ? Number(startStr) : 0;
      end = endStr ? Math.min(Number(endStr), totalSize - 1) : totalSize - 1;
    }

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
      return new Response('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const chunkSize = end - start + 1;
    return new Response(file.slice(start, end + 1), {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Content-Length': String(chunkSize),
      },
    });
  }

  return new Response(file, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(totalSize),
    },
  });
}

