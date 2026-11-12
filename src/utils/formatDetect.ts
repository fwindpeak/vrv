import type { MediaKind, ProjectionFormat } from '../types';

const VIDEO_EXTS = new Set([
  'mp4',
  'webm',
  'mov',
  'm4v',
  'mkv',
  'ogv',
  'avi',
  '3gp',
]);

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'avif',
  'svg',
]);

export function inferMediaKind(nameOrUrl: string, mimeType?: string): MediaKind {
  if (mimeType) {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
  }

  const clean = nameOrUrl.split('?')[0].split('#')[0].toLowerCase();
  const dot = clean.lastIndexOf('.');
  if (dot !== -1) {
    const ext = clean.slice(dot + 1);
    if (VIDEO_EXTS.has(ext)) return 'video';
    if (IMAGE_EXTS.has(ext)) return 'image';
  }

  // Fallback heuristics for URLs containing video hints
  if (/(\/video|\.mp4|\.webm|\.mov|mime=video)/i.test(nameOrUrl)) {
    return 'video';
  }
  return 'image';
}

/**
 * Inspect the leading bytes of a local JPEG/MP4 file for GPano / VR180 XMP metadata.
 * Returns a hinted ProjectionFormat if found, or null otherwise.
 */
export async function inspectFileMetadataHint(file: File): Promise<ProjectionFormat | null> {
  try {
    const chunk = await file.slice(0, 131072).text();
    const hasEquirect =
      /GPano:ProjectionType[^>]*equirectangular/i.test(chunk) ||
      /ProjectionType="equirectangular"/i.test(chunk) ||
      /st3d/i.test(chunk) ||
      /sv3d/i.test(chunk);

    const isHalfPano =
      /GPano:CroppedAreaImageWidthPixels/i.test(chunk) &&
      /GPano:FullPanoWidthPixels/i.test(chunk);

    const hasStereo =
      /GImage:Data/i.test(chunk) ||
      /StereoMode/i.test(chunk) ||
      /vr180/i.test(chunk);

    if (/vr180/i.test(chunk)) {
      return 'vr180-sbs';
    }
    if (hasEquirect) {
      if (isHalfPano || hasStereo) {
        return 'vr180-sbs';
      }
      return '360-mono';
    }
  } catch {
    // Ignore metadata read errors
  }
  return null;
}

/**
 * Guess the best projection format from filename keywords, optional XMP hint, and dimensions.
 */
export function detectProjectionFormat(
  name: string,
  width: number,
  height: number,
  metadataHint?: ProjectionFormat | null
): ProjectionFormat {
  const lower = name.toLowerCase();
  const ratio = height > 0 ? width / height : 16 / 9;

  // Explicit filename tags first
  const has180 = /(^|[_\-. \[])(vr180|180x180|180sbs|180_sbs|180tb|180_tb|180)([_\-. \]]|$)/.test(
    lower
  );
  const has360 = /(^|[_\-. \[])(360|equirect|equirectangular|pano360|insta360)([_\-. \]]|$)/.test(
    lower
  );
  const hasSBS = /(^|[_\-. \[])(sbs|lr|leftright|3dh|half-sbs|hsbs)([_\-. \]]|$)/.test(lower);
  const hasTB = /(^|[_\-. \[])(tb|ou|topbottom|overunder|3dv)([_\-. \]]|$)/.test(lower);

  if (has180) {
    if (hasTB) return 'vr180-tb';
    if (hasSBS) return 'vr180-sbs';
    if (Math.abs(ratio - 1.0) < 0.12) return 'vr180-mono';
    return 'vr180-sbs';
  }

  if (has360) {
    if (hasTB || Math.abs(ratio - 1.0) < 0.12) return '360-tb';
    if (hasSBS || Math.abs(ratio - 4.0) < 0.25) return '360-sbs';
    return '360-mono';
  }

  if (hasSBS) {
    // 2:1 SBS could be VR180 SBS, otherwise 2D SBS
    if (Math.abs(ratio - 2.0) < 0.15) return 'vr180-sbs';
    return '2d-sbs';
  }

  if (hasTB) {
    if (Math.abs(ratio - 1.0) < 0.15) return '360-tb';
    return '2d-tb';
  }

  if (metadataHint) {
    return metadataHint;
  }

  // Aspect ratio heuristics when no tags are present
  if (width > 0 && height > 0) {
    if (Math.abs(ratio - 4.0) < 0.2) {
      return '360-sbs';
    }
    if (Math.abs(ratio - 2.0) < 0.08 && width >= 1024) {
      // Standard 2:1 equirectangular (360 mono). Users can toggle to VR180 SBS in one click if needed.
      return '360-mono';
    }
    if (Math.abs(ratio - 1.0) < 0.06 && width >= 2048) {
      // 1:1 high-res could be 360 TB
      return '360-tb';
    }
  }

  return '2d';
}
