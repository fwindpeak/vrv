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

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: '2d',
    label: '2D 平面',
    shortLabel: '2D',
    description: '普通平面照片或视频',
  },
  {
    value: 'vr180-sbs',
    label: 'VR180 左右双目 (SBS)',
    shortLabel: 'VR180 SBS',
    description: '180° 半球立体（左眼左半幅、右眼右半幅）',
  },
  {
    value: 'vr180-tb',
    label: 'VR180 上下双目 (TB)',
    shortLabel: 'VR180 TB',
    description: '180° 半球立体（左眼上半幅、右眼下半幅）',
  },
  {
    value: 'vr180-mono',
    label: 'VR180 单目',
    shortLabel: 'VR180 单目',
    description: '180° 半球单视角全景',
  },
  {
    value: '360-mono',
    label: '360° 全景单目',
    shortLabel: '360°',
    description: '360° 等距柱状投影全景（2:1）',
  },
  {
    value: '360-tb',
    label: '360° 上下双目 (TB)',
    shortLabel: '360° TB',
    description: '360° 立体全景（上下分屏 1:1）',
  },
  {
    value: '360-sbs',
    label: '360° 左右双目 (SBS)',
    shortLabel: '360° SBS',
    description: '360° 立体全景（左右分屏 4:1）',
  },
  {
    value: '2d-sbs',
    label: '3D 巨幕左右 (SBS)',
    shortLabel: '3D SBS',
    description: '平面 3D 电影/照片（左右半幅）',
  },
  {
    value: '2d-tb',
    label: '3D 巨幕上下 (TB)',
    shortLabel: '3D TB',
    description: '平面 3D 电影/照片（上下半幅）',
  },
];
