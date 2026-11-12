import './style.css';
import { applyI18nToDom, onLocaleChange, t, toggleLocale } from './i18n';
import { getFormatOption, getFormatOptions, type MediaItem, type MediaKind, type ProjectionFormat } from './types';
import {
  detectProjectionFormat,
  inferMediaKind,
  inspectFileMetadataHint,
} from './utils/formatDetect';
import { createSampleItems } from './utils/sampleMedia';
import { DriveModalController, type DrivePlayableItem } from './ui/driveModal';
import { VRViewerEngine } from './viewer/VRViewerEngine';

// DOM Elements
const viewerStage = document.getElementById('viewer-stage') as HTMLElement;
const welcomeOverlay = document.getElementById('welcome-overlay') as HTMLElement;
const dropOverlay = document.getElementById('drop-overlay') as HTMLElement;
const hudTop = document.getElementById('hud-top') as HTMLElement;
const hudBottom = document.getElementById('hud-bottom') as HTMLElement;
const btnRestoreHud = document.getElementById('btn-restore-hud') as HTMLButtonElement;

const mediaTitleEl = document.getElementById('media-title') as HTMLElement;
const mediaBadgeEl = document.getElementById('media-badge') as HTMLElement;

const fileInput = document.getElementById('file-input') as HTMLInputElement;
const btnAddLocal = document.getElementById('btn-add-local') as HTMLButtonElement;
const btnOpenGDrive = document.getElementById('btn-open-gdrive') as HTMLButtonElement;
const btnAddUrl = document.getElementById('btn-add-url') as HTMLButtonElement;
const btnEnterVR = document.getElementById('btn-enter-vr') as HTMLButtonElement;
const btnToggleLang = document.getElementById('btn-toggle-lang') as HTMLButtonElement;
const btnToggleTheme = document.getElementById('btn-toggle-theme') as HTMLButtonElement;
const btnTogglePlaylist = document.getElementById('btn-toggle-playlist') as HTMLButtonElement;
const btnToggleHud = document.getElementById('btn-toggle-hud') as HTMLButtonElement;

const welcomeLocalBtn = document.getElementById('welcome-local-btn') as HTMLButtonElement;
const welcomeGDriveBtn = document.getElementById('welcome-gdrive-btn') as HTMLButtonElement;
const welcomeUrlBtn = document.getElementById('welcome-url-btn') as HTMLButtonElement;
const welcomeSampleBtn = document.getElementById('welcome-sample-btn') as HTMLButtonElement;

const formatSelect = document.getElementById('format-select') as HTMLSelectElement;
const quickFormatPills = document.getElementById('quick-format-pills') as HTMLElement;
const chkSwapEyes = document.getElementById('chk-swap-eyes') as HTMLInputElement;
const btnResetView = document.getElementById('btn-reset-view') as HTMLButtonElement;
const btnFullscreen = document.getElementById('btn-fullscreen') as HTMLButtonElement;
const btnHelp = document.getElementById('btn-help') as HTMLButtonElement;

const videoBar = document.getElementById('video-bar') as HTMLElement;
const btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
const videoTimeEl = document.getElementById('video-time') as HTMLElement;
const videoSeek = document.getElementById('video-seek') as HTMLInputElement;
const btnMute = document.getElementById('btn-mute') as HTMLButtonElement;
const videoVolume = document.getElementById('video-volume') as HTMLInputElement;

const playlistDrawer = document.getElementById('playlist-drawer') as HTMLElement;
const playlistCountEl = document.getElementById('playlist-count') as HTMLElement;
const playlistItemsEl = document.getElementById('playlist-items') as HTMLElement;
const btnClosePlaylist = document.getElementById('btn-close-playlist') as HTMLButtonElement;
const btnLoadSamples = document.getElementById('btn-load-samples') as HTMLButtonElement;

const urlModal = document.getElementById('url-modal') as HTMLElement;
const urlModalBackdrop = document.getElementById('url-modal-backdrop') as HTMLElement;
const urlModalClose = document.getElementById('url-modal-close') as HTMLButtonElement;
const urlCancelBtn = document.getElementById('url-cancel-btn') as HTMLButtonElement;
const urlForm = document.getElementById('url-form') as HTMLFormElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const urlKindSelect = document.getElementById('url-kind-select') as HTMLSelectElement;
const urlFormatSelect = document.getElementById('url-format-select') as HTMLSelectElement;

const helpModal = document.getElementById('help-modal') as HTMLElement;
const helpModalBackdrop = document.getElementById('help-modal-backdrop') as HTMLElement;
const helpModalClose = document.getElementById('help-modal-close') as HTMLButtonElement;

const toastEl = document.getElementById('toast') as HTMLElement;

// Theme State
type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'vrviewer-theme';

function detectInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage access errors
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

let currentTheme: Theme = detectInitialTheme();

function applyTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  btnToggleTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  btnToggleTheme.title =
    theme === 'dark' ? t('hud.themeToLightTitle') : t('hud.themeToDarkTitle');
  btnToggleTheme.setAttribute('aria-label', btnToggleTheme.title);
}

function toggleTheme(): void {
  const next: Theme = currentTheme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage access errors
  }
  applyTheme(next);
}

// App State
const playlist: MediaItem[] = [];
let activeId: string | null = null;
let xrSupported = false;
let hudVisible = true;
let isSeeking = false;
let toastTimer: number | null = null;

function showToast(message: string, durationMs = 3500): void {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastEl.classList.add('hidden');
  }, durationMs);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function populateFormatSelects(): void {
  const prevMain = formatSelect.value;
  const prevUrl = urlFormatSelect.value || 'auto';

  formatSelect.innerHTML = '';
  urlFormatSelect.innerHTML = '';

  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  autoOpt.textContent = t('urlModal.formatAuto');
  urlFormatSelect.appendChild(autoOpt);

  for (const opt of getFormatOptions()) {
    const o1 = document.createElement('option');
    o1.value = opt.value;
    o1.textContent = opt.label;
    formatSelect.appendChild(o1);

    const o2 = document.createElement('option');
    o2.value = opt.value;
    o2.textContent = opt.label;
    urlFormatSelect.appendChild(o2);
  }

  if (prevMain && Array.from(formatSelect.options).some((o) => o.value === prevMain)) {
    formatSelect.value = prevMain;
  }
  if (prevUrl && Array.from(urlFormatSelect.options).some((o) => o.value === prevUrl)) {
    urlFormatSelect.value = prevUrl;
  }
}

const engine = new VRViewerEngine(viewerStage, {
  onXRStateChange: (inXR) => {
    btnEnterVR.textContent = inXR ? t('hud.exitVR') : t('hud.enterVR');
  },
  onMediaLoaded: async (width, height) => {
    const current = playlist.find((item) => item.id === activeId);
    if (!current) return;

    current.width = width;
    current.height = height;

    // Refine auto-detected format once real dimensions & file metadata are known
    if (current.format === current.autoDetectedFormat && !current.id.startsWith('sample-')) {
      const hint = current.file ? await inspectFileMetadataHint(current.file) : null;
      const refined = detectProjectionFormat(current.name, width, height, hint);
      current.autoDetectedFormat = refined;
      if (current.format !== refined) {
        current.format = refined;
        engine.setFormat(refined);
      }
    }

    updateMediaHeader(current);
    syncFormatUI(current.format);
    renderPlaylist();
  },
  onMediaError: (message) => {
    showToast(message, 5000);
  },
  onVideoStateChange: () => {
    syncVideoUI();
  },
});

async function initXRSupport(): Promise<void> {
  xrSupported = await engine.isXRSupported();
  if (!xrSupported) {
    btnEnterVR.classList.add('vr-unsupported');
    btnEnterVR.title = t('hud.enterVRUnsupportedTitle');
  }
}

function updateMediaHeader(item: MediaItem | undefined): void {
  if (!item) {
    mediaTitleEl.textContent = t('hud.noMedia');
    mediaBadgeEl.classList.add('hidden');
    return;
  }
  mediaTitleEl.textContent = item.name;
  const dims = item.width && item.height ? `${item.width}×${item.height}` : '';
  const kindLabel = item.kind === 'video' ? t('media.video') : t('media.image');
  const fmtOpt = getFormatOption(item.format);
  mediaBadgeEl.textContent = [kindLabel, fmtOpt?.shortLabel ?? item.format, dims]
    .filter(Boolean)
    .join(' · ');
  mediaBadgeEl.classList.remove('hidden');
}

function syncFormatUI(format: ProjectionFormat): void {
  formatSelect.value = format;
  const pills = quickFormatPills.querySelectorAll<HTMLButtonElement>('.pill');
  pills.forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.fmt === format);
  });
}

function syncVideoUI(): void {
  const video = engine.getVideoElement();
  if (!video) {
    videoBar.classList.add('hidden');
    return;
  }

  videoBar.classList.remove('hidden');
  btnPlayPause.textContent = video.paused ? '▶' : '⏸';
  btnMute.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  videoVolume.value = String(video.muted ? 0 : video.volume);

  const cur = video.currentTime || 0;
  const dur = Number.isFinite(video.duration) ? video.duration : 0;
  videoTimeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

  if (!isSeeking && dur > 0) {
    videoSeek.value = String(Math.round((cur / dur) * 1000));
  }
}

async function selectMedia(id: string): Promise<void> {
  const item = playlist.find((i) => i.id === id);
  if (!item) return;

  activeId = id;
  welcomeOverlay.classList.add('hidden');
  updateMediaHeader(item);
  syncFormatUI(item.format);
  renderPlaylist();

  if (item.kind === 'image') {
    videoBar.classList.add('hidden');
  }

  try {
    await engine.loadMedia(item.url, item.kind, item.format);
  } catch {
    // Error toast is already handled by onMediaError
  }
}

function removeMedia(id: string): void {
  const idx = playlist.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const [removed] = playlist.splice(idx, 1);
  if (removed.isLocal && removed.url.startsWith('blob:')) {
    URL.revokeObjectURL(removed.url);
  }

  if (activeId === id) {
    const next = playlist[idx] ?? playlist[idx - 1];
    if (next) {
      selectMedia(next.id);
    } else {
      activeId = null;
      welcomeOverlay.classList.remove('hidden');
      updateMediaHeader(undefined);
      videoBar.classList.add('hidden');
    }
  }
  renderPlaylist();
}

function renderPlaylist(): void {
  playlistCountEl.textContent = String(playlist.length);
  playlistItemsEl.innerHTML = '';

  if (playlist.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '24px 12px';
    empty.style.textAlign = 'center';
    empty.style.fontSize = '13px';
    empty.style.color = 'var(--text-muted)';
    empty.textContent = t('playlist.empty');
    playlistItemsEl.appendChild(empty);
    return;
  }

  for (const item of playlist) {
    const row = document.createElement('div');
    row.className = `playlist-item ${item.id === activeId ? 'active' : ''}`;
    row.addEventListener('click', () => selectMedia(item.id));

    const info = document.createElement('div');
    info.className = 'playlist-item-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'playlist-item-name';
    nameEl.textContent = item.name;

    const subEl = document.createElement('div');
    subEl.className = 'playlist-item-sub';
    const fmtShort = getFormatOption(item.format)?.shortLabel ?? item.format;
    const sourceTag = item.sourceLabel ?? (item.isLocal ? t('playlist.localTag') : '');
    subEl.textContent = `${item.kind === 'video' ? t('media.video') : t('media.image')} · ${fmtShort}${
      sourceTag ? ` · ${sourceTag}` : ''
    }`;

    info.appendChild(nameEl);
    info.appendChild(subEl);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-icon-sm';
    delBtn.textContent = '✕';
    delBtn.title = t('playlist.removeTitle');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeMedia(item.id);
    });

    row.appendChild(info);
    row.appendChild(delBtn);
    playlistItemsEl.appendChild(row);
  }
}

function addLocalFiles(files: FileList | File[]): void {
  const list = Array.from(files).filter(
    (f) => f.type.startsWith('image/') || f.type.startsWith('video/') || /\.(jpg|jpeg|png|webp|mp4|webm|mov|mkv)$/i.test(f.name)
  );
  if (list.length === 0) {
    showToast(t('toast.noSupportedFiles'));
    return;
  }

  let firstAddedId: string | null = null;
  for (const file of list) {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const kind = inferMediaKind(file.name, file.type);
    const initialFmt = detectProjectionFormat(file.name, 0, 0);
    const url = URL.createObjectURL(file);

    const item: MediaItem = {
      id,
      name: file.name,
      url,
      isLocal: true,
      kind,
      format: initialFmt,
      autoDetectedFormat: initialFmt,
      file,
    };
    playlist.push(item);
    if (!firstAddedId) firstAddedId = id;
  }

  renderPlaylist();
  if (firstAddedId) {
    selectMedia(firstAddedId);
  }
}

function addUrlItem(
  rawUrl: string,
  kindChoice: 'auto' | MediaKind,
  formatChoice: 'auto' | ProjectionFormat
): void {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;

  let name = trimmed;
  try {
    const parsed = new URL(trimmed);
    const seg = parsed.pathname.split('/').filter(Boolean).pop();
    name = seg ? decodeURIComponent(seg) : parsed.hostname;
  } catch {
    showToast(t('toast.invalidUrl'));
    return;
  }

  const kind: MediaKind = kindChoice === 'auto' ? inferMediaKind(trimmed) : kindChoice;
  const autoFmt =
    formatChoice === 'auto' ? detectProjectionFormat(name, 0, 0) : formatChoice;

  const item: MediaItem = {
    id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    url: trimmed,
    isLocal: false,
    kind,
    format: autoFmt,
    autoDetectedFormat: formatChoice === 'auto' ? autoFmt : formatChoice,
  };

  // If user explicitly picked a format, mark autoDetectedFormat differently so onMediaLoaded won't override it
  if (formatChoice !== 'auto') {
    item.autoDetectedFormat = '2d';
    if (formatChoice === '2d') {
      // keep a sentinel or just avoid overriding when explicit
      item.autoDetectedFormat = 'vr180-mono';
    }
  }

  playlist.push(item);
  renderPlaylist();
  selectMedia(item.id);
}

function loadSamples(): void {
  const samples = createSampleItems();
  let firstId: string | null = null;
  for (const s of samples) {
    if (!playlist.some((p) => p.id === s.id)) {
      playlist.push(s);
    }
    if (!firstId) firstId = s.id;
  }
  renderPlaylist();
  if (firstId) selectMedia(firstId);
}

function setFormatForCurrent(fmt: ProjectionFormat): void {
  const current = playlist.find((i) => i.id === activeId);
  if (current) {
    current.format = fmt;
    updateMediaHeader(current);
    renderPlaylist();
  }
  engine.setFormat(fmt);
  syncFormatUI(fmt);
}

function toggleHud(force?: boolean): void {
  hudVisible = force !== undefined ? force : !hudVisible;
  hudTop.classList.toggle('hidden', !hudVisible);
  hudBottom.classList.toggle('hidden', !hudVisible);
  btnRestoreHud.classList.toggle('hidden', hudVisible);
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// Event Listeners
btnAddLocal.addEventListener('click', () => fileInput.click());
welcomeLocalBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    addLocalFiles(fileInput.files);
    fileInput.value = '';
  }
});

const openUrlModal = () => {
  urlModal.classList.remove('hidden');
  urlInput.focus();
};
const closeUrlModal = () => urlModal.classList.add('hidden');

btnAddUrl.addEventListener('click', openUrlModal);
welcomeUrlBtn.addEventListener('click', openUrlModal);
urlModalBackdrop.addEventListener('click', closeUrlModal);
urlModalClose.addEventListener('click', closeUrlModal);
urlCancelBtn.addEventListener('click', closeUrlModal);

urlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addUrlItem(
    urlInput.value,
    urlKindSelect.value as 'auto' | MediaKind,
    urlFormatSelect.value as 'auto' | ProjectionFormat
  );
  urlInput.value = '';
  closeUrlModal();
});

welcomeSampleBtn.addEventListener('click', loadSamples);
btnLoadSamples.addEventListener('click', loadSamples);

btnEnterVR.addEventListener('click', async () => {
  if (engine.isInVR()) {
    await engine.exitVR();
    return;
  }
  if (!xrSupported) {
    showToast(t('toast.noWebXR'), 5000);
    return;
  }
  try {
    await engine.enterVR();
  } catch (err) {
    showToast(
      t('toast.vrEnterFailed', {
        msg: err instanceof Error ? err.message : t('toast.unknownError'),
      })
    );
  }
});

formatSelect.addEventListener('change', () => {
  setFormatForCurrent(formatSelect.value as ProjectionFormat);
});

quickFormatPills.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.pill');
  if (!target?.dataset.fmt) return;
  setFormatForCurrent(target.dataset.fmt as ProjectionFormat);
});

chkSwapEyes.addEventListener('change', () => {
  engine.setSwapEyes(chkSwapEyes.checked);
});

btnResetView.addEventListener('click', () => engine.resetView());
btnFullscreen.addEventListener('click', toggleFullscreen);
btnToggleHud.addEventListener('click', () => toggleHud(false));
btnRestoreHud.addEventListener('click', () => toggleHud(true));

btnTogglePlaylist.addEventListener('click', () => {
  playlistDrawer.classList.toggle('hidden');
});
btnClosePlaylist.addEventListener('click', () => {
  playlistDrawer.classList.add('hidden');
});

const openHelp = () => helpModal.classList.remove('hidden');
const closeHelp = () => helpModal.classList.add('hidden');
btnHelp.addEventListener('click', openHelp);
helpModalBackdrop.addEventListener('click', closeHelp);
helpModalClose.addEventListener('click', closeHelp);

// Video controls
btnPlayPause.addEventListener('click', () => engine.togglePlayPause());
btnMute.addEventListener('click', () => {
  const v = engine.getVideoElement();
  if (!v) return;
  v.muted = !v.muted;
  syncVideoUI();
});
videoVolume.addEventListener('input', () => {
  const v = engine.getVideoElement();
  if (!v) return;
  const val = Number(videoVolume.value);
  v.volume = val;
  v.muted = val === 0;
  syncVideoUI();
});
videoSeek.addEventListener('pointerdown', () => {
  isSeeking = true;
});
videoSeek.addEventListener('input', () => {
  const v = engine.getVideoElement();
  if (!v || !Number.isFinite(v.duration)) return;
  const targetTime = (Number(videoSeek.value) / 1000) * v.duration;
  videoTimeEl.textContent = `${formatTime(targetTime)} / ${formatTime(v.duration)}`;
});
videoSeek.addEventListener('change', () => {
  const v = engine.getVideoElement();
  if (v && Number.isFinite(v.duration)) {
    v.currentTime = (Number(videoSeek.value) / 1000) * v.duration;
  }
  isSeeking = false;
});

// Global Drag & Drop
let dragCounter = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.remove('hidden');
});
window.addEventListener('dragover', (e) => {
  e.preventDefault();
});
window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.add('hidden');
  }
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.add('hidden');
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addLocalFiles(e.dataTransfer.files);
  }
});

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.code === 'Space') {
    if (engine.getVideoElement()) {
      e.preventDefault();
      engine.togglePlayPause();
    }
  } else if (e.code === 'KeyF') {
    toggleFullscreen();
  } else if (e.code === 'KeyH') {
    toggleHud();
  } else if (e.code === 'KeyM') {
    const v = engine.getVideoElement();
    if (v) {
      v.muted = !v.muted;
      syncVideoUI();
    }
  } else if (e.code === 'KeyJ') {
    engine.seekBy(-5);
  } else if (e.code === 'KeyL') {
    engine.seekBy(5);
  } else if (e.key === '?') {
    helpModal.classList.toggle('hidden');
  } else if (e.code === 'Escape') {
    closeUrlModal();
    closeHelp();
    driveModal.close();
  }
});

function upsertDriveItems(items: DrivePlayableItem[], selectFirst: boolean): void {
  let firstId: string | null = null;
  for (const d of items) {
    if (!playlist.some((p) => p.id === d.id)) {
      playlist.push({
        id: d.id,
        name: d.name,
        url: d.url,
        isLocal: false,
        sourceLabel: d.sourceLabel,
        kind: d.kind,
        format: d.format,
        autoDetectedFormat: d.format,
        width: d.width,
        height: d.height,
      });
    }
    if (!firstId) firstId = d.id;
  }
  renderPlaylist();
  if (selectFirst && firstId) {
    selectMedia(firstId);
  }
}

const driveModal = new DriveModalController({
  onPlayItem: (item) => upsertDriveItems([item], true),
  onAddItems: (items, selectFirst) => upsertDriveItems(items, selectFirst),
  onToast: (msg, ms) => showToast(msg, ms),
});

const isStaticDeploy = import.meta.env.VITE_STATIC_DEPLOY === 'true';

function hideGDriveButtons(): void {
  btnOpenGDrive.classList.add('hidden');
  welcomeGDriveBtn.classList.add('hidden');
}

async function initGDriveAvailability(): Promise<void> {
  if (isStaticDeploy) {
    hideGDriveButtons();
    return;
  }
  if (import.meta.env.PROD) {
    try {
      const res = await fetch('/api/gdrive/status');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        hideGDriveButtons();
      }
    } catch {
      hideGDriveButtons();
    }
  }
}

btnOpenGDrive.addEventListener('click', () => driveModal.open());
welcomeGDriveBtn.addEventListener('click', () => driveModal.open());
btnToggleLang.addEventListener('click', () => toggleLocale());
btnToggleTheme.addEventListener('click', () => toggleTheme());

onLocaleChange(() => {
  populateFormatSelects();
  const current = playlist.find((i) => i.id === activeId);
  updateMediaHeader(current);
  renderPlaylist();
  btnEnterVR.textContent = engine.isInVR() ? t('hud.exitVR') : t('hud.enterVR');
  if (!xrSupported) {
    btnEnterVR.title = t('hud.enterVRUnsupportedTitle');
  }
  applyTheme(currentTheme);
  driveModal.refreshLocale();
});

// Init
applyI18nToDom();
applyTheme(currentTheme);
populateFormatSelects();
renderPlaylist();
initXRSupport();
initGDriveAvailability();
