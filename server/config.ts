import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface MountConfig {
  id: string;
  name: string;
  path: string;
  kind: 'gdrive-desktop' | 'local';
  createdAt: string;
}

export interface GDriveCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface GDriveTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  email?: string;
  displayName?: string;
  photoLink?: string;
}

export interface AppDataConfig {
  mounts: MountConfig[];
  gdriveCredentials?: GDriveCredentials;
  gdriveTokens?: GDriveTokens;
}

const DATA_FILE = resolve(process.cwd(), '.vrviewer-data.json');

export function loadConfig(): AppDataConfig {
  let parsed: Partial<AppDataConfig> = {};
  if (existsSync(DATA_FILE)) {
    try {
      const raw = readFileSync(DATA_FILE, 'utf8');
      parsed = JSON.parse(raw) as Partial<AppDataConfig>;
    } catch {
      parsed = {};
    }
  }

  const envClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  const gdriveCredentials: GDriveCredentials | undefined =
    parsed.gdriveCredentials?.clientId && parsed.gdriveCredentials?.clientSecret
      ? parsed.gdriveCredentials
      : envClientId && envClientSecret
        ? {
            clientId: envClientId,
            clientSecret: envClientSecret,
            redirectUri: envRedirectUri,
          }
        : undefined;

  return {
    mounts: Array.isArray(parsed.mounts) ? parsed.mounts : [],
    gdriveCredentials,
    gdriveTokens: parsed.gdriveTokens,
  };
}

export function saveConfig(config: AppDataConfig): void {
  writeFileSync(DATA_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export function updateConfig(updater: (current: AppDataConfig) => AppDataConfig): AppDataConfig {
  const next = updater(loadConfig());
  saveConfig(next);
  return next;
}

