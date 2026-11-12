import type { MediaItem } from '../types';

function createCanvasDataUrl(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  return canvas.toDataURL('image/png');
}

function drawGridSphere(
  ctx: CanvasRenderingContext2D,
  xOffset: number,
  w: number,
  h: number,
  parallaxShift: number,
  title: string,
  subtitle: string
): void {
  const grad = ctx.createLinearGradient(xOffset, 0, xOffset, h);
  grad.addColorStop(0, '#0b132b');
  grad.addColorStop(0.48, '#1c2541');
  grad.addColorStop(0.5, '#3a506b');
  grad.addColorStop(0.52, '#1b263b');
  grad.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = grad;
  ctx.fillRect(xOffset, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(xOffset, 0, w, h);
  ctx.clip();

  // Latitude & longitude lines
  ctx.strokeStyle = 'rgba(91, 192, 190, 0.28)';
  ctx.lineWidth = 2;
  const cols = 12;
  const rows = 8;
  for (let i = 1; i < cols; i++) {
    const x = xOffset + (w / cols) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (h / rows) * j;
    ctx.beginPath();
    ctx.moveTo(xOffset, y);
    ctx.lineTo(xOffset + w, y);
    ctx.stroke();
  }

  // Horizon line
  ctx.strokeStyle = 'rgba(111, 255, 233, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xOffset, h / 2);
  ctx.lineTo(xOffset + w, h / 2);
  ctx.stroke();

  // Floating 3D-parallax shapes
  const cx = xOffset + w / 2 + parallaxShift;
  const cy = h / 2;

  ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy - 40, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Foreground badge with stronger parallax
  const fgX = xOffset + w / 2 + parallaxShift * 2.2;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#6fffe9';
  ctx.lineWidth = 3;
  const boxW = Math.min(w * 0.52, 540);
  const boxH = 140;
  ctx.beginPath();
  ctx.roundRect(fgX - boxW / 2, cy - 20, boxW, boxH, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, fgX, cy + 42);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle, fgX, cy + 84);

  ctx.restore();
}

export function createSampleItems(): MediaItem[] {
  const vr180Url = createCanvasDataUrl(2048, 1024, (ctx, w, h) => {
    const half = w / 2;
    drawGridSphere(ctx, 0, half, h, 14, 'VR180 立体测试图', '左眼视角 (Left Eye)');
    drawGridSphere(ctx, half, half, h, -14, 'VR180 立体测试图', '右眼视角 (Right Eye)');
  });

  const pano360Url = createCanvasDataUrl(2048, 1024, (ctx, w, h) => {
    drawGridSphere(ctx, 0, w, h, 0, '360° 全景测试图', '拖拽鼠标或 WASD 环顾四周');
    ctx.fillStyle = 'rgba(248, 250, 252, 0.75)';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← 左 (90°)', w * 0.25, h * 0.45);
    ctx.fillText('右 (90°) →', w * 0.75, h * 0.45);
    ctx.fillText('后方 (180°)', w * 0.06, h * 0.45);
  });

  return [
    {
      id: 'sample-vr180',
      name: '示例：VR180 双目立体图',
      url: vr180Url,
      isLocal: false,
      kind: 'image',
      format: 'vr180-sbs',
      autoDetectedFormat: 'vr180-sbs',
      width: 2048,
      height: 1024,
    },
    {
      id: 'sample-360',
      name: '示例：360° 全景图',
      url: pano360Url,
      isLocal: false,
      kind: 'image',
      format: '360-mono',
      autoDetectedFormat: '360-mono',
      width: 2048,
      height: 1024,
    },
  ];
}
