import { t } from './i18n';

export type MediaKind = 'image' | 'video';

export type ProjectionFormat =
  | '2d'
  | '2d-sbs'
  | '2d-tb'
  | 'vr180-sbs'
  | 'vr180-tb'
  | 'vr180-mono'
  | '360-mono'
  | '360-tb'
  | '360-sbs';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  isLocal: boolean;
  sourceLabel?: string;
  kind: MediaKind;
  format: ProjectionFormat;
  autoDetectedFormat: ProjectionFormat;
  width?: number;
  height?: number;
  file?: File;
}

export interface FormatOption {
  value: ProjectionFormat;
  label: string;
  shortLabel: string;
  description: string;
}

const FORMAT_VALUES: ProjectionFormat[] = [
  '2d',
  'vr180-sbs',
  'vr180-tb',
  'vr180-mono',
  '360-mono',
  '360-tb',
  '360-sbs',
  '2d-sbs',
  '2d-tb',
];

export function getFormatOptions(): FormatOption[] {
  return FORMAT_VALUES.map((value) => ({
    value,
    label: t(`format.${value}.label`),
    shortLabel: t(`format.${value}.short`),
    description: t(`format.${value}.desc`),
  }));
}

export function getFormatOption(format: ProjectionFormat): FormatOption | undefined {
  return getFormatOptions().find((f) => f.value === format);
}
