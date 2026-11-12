import type { MediaKind, ProjectionFormat } from '../types';
import { detectProjectionFormat } from '../utils/formatDetect';
import {
  browseMountDir,
  connectGDriveToken,
  createMount,
  deleteMount,
  disconnectGDriveAccount,
  fetchGDriveAuthUrl,
  fetchGDriveFiles,
  fetchGDriveStatus,
  fetchMounts,
  getGDriveStreamUrl,
  getMountStreamUrl,
  saveGDriveCreds,
  type DetectedMountInfo,
  type GDriveFileItem,
  type MountBrowseEntry,
  type MountInfo,
} from '../api/driveClient';

export interface DrivePlayableItem {
  id: string;
  name: string;
  url: string;
  kind: MediaKind;
  format: ProjectionFormat;
  sourceLabel: string;
  width?: number;
  height?: number;
}

export interface DriveModalCallbacks {
  onPlayItem: (item: DrivePlayableItem) => void;
  onAddItems: (items: DrivePlayableItem[], selectFirst: boolean) => void;
  onToast: (message: string, durationMs?: number) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export class DriveModalController {
  private callbacks: DriveModalCallbacks;

  private modal = document.getElementById('gdrive-modal') as HTMLElement;
  private backdrop = document.getElementById('gdrive-modal-backdrop') as HTMLElement;
  private closeBtn = document.getElementById('gdrive-modal-close') as HTMLButtonElement;

  private tabCloud = document.getElementById('tab-gdrive-cloud') as HTMLButtonElement;
  private tabMounts = document.getElementById('tab-gdrive-mounts') as HTMLButtonElement;
  private panelCloud = document.getElementById('panel-gdrive-cloud') as HTMLElement;
  private panelMounts = document.getElementById('panel-gdrive-mounts') as HTMLElement;

  // Cloud elements
  private authBox = document.getElementById('gdrive-auth-box') as HTMLElement;
  private browserBox = document.getElementById('gdrive-browser-box') as HTMLElement;
  private redirectUriEl = document.getElementById('gdrive-redirect-uri') as HTMLElement;
  private copyRedirectBtn = document.getElementById('btn-copy-redirect') as HTMLButtonElement;
  private clientIdInput = document.getElementById('gdrive-client-id') as HTMLInputElement;
  private clientSecretInput = document.getElementById('gdrive-client-secret') as HTMLInputElement;
  private saveConnectBtn = document.getElementById('btn-gdrive-save-connect') as HTMLButtonElement;
  private manualTokenInput = document.getElementById('gdrive-manual-token') as HTMLInputElement;
  private manualConnectBtn = document.getElementById('btn-gdrive-manual-connect') as HTMLButtonElement;
  private accountLabel = document.getElementById('gdrive-account-label') as HTMLElement;
  private disconnectBtn = document.getElementById('btn-gdrive-disconnect') as HTMLButtonElement;
  private viewPills = document.querySelector('.drive-view-pills') as HTMLElement;
  private searchInput = document.getElementById('gdrive-search-input') as HTMLInputElement;
  private breadcrumbsEl = document.getElementById('gdrive-breadcrumbs') as HTMLElement;
  private addAllCloudBtn = document.getElementById('btn-gdrive-add-all') as HTMLButtonElement;
  private fileListEl = document.getElementById('gdrive-file-list') as HTMLElement;

  // Mount elements
  private mountPathInput = document.getElementById('mount-path-input') as HTMLInputElement;
  private mountAddBtn = document.getElementById('btn-mount-add') as HTMLButtonElement;
  private mountDetectedBar = document.getElementById('mount-detected-bar') as HTMLElement;
  private mountListEl = document.getElementById('mount-list') as HTMLElement;
  private mountBreadcrumbsEl = document.getElementById('mount-breadcrumbs') as HTMLElement;
  private mountAddAllBtn = document.getElementById('btn-mount-add-all') as HTMLButtonElement;
  private mountFileListEl = document.getElementById('mount-file-list') as HTMLElement;

  // State
  private cloudView: 'my-drive' | 'shared' | 'all-media' = 'my-drive';
  private cloudStack: Array<{ id: string; name: string }> = [{ id: 'root', name: '我的云端硬盘' }];
  private cloudFiles: GDriveFileItem[] = [];
  private cloudNextToken: string | undefined;
  private cloudSearchTimer: number | null = null;

  private mounts: MountInfo[] = [];
  private detectedMounts: DetectedMountInfo[] = [];
  private activeMountId: string | null = null;
  private mountRelPath = '';
  private mountEntries: MountBrowseEntry[] = [];

  constructor(callbacks: DriveModalCallbacks) {
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.backdrop.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());

    this.tabCloud.addEventListener('click', () => this.switchTab('cloud'));
    this.tabMounts.addEventListener('click', () => this.switchTab('mounts'));

    this.copyRedirectBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.redirectUriEl.textContent || '');
        this.callbacks.onToast('已复制回调地址');
      } catch {
        this.callbacks.onToast('复制失败，请手动复制');
      }
    });

    this.saveConnectBtn.addEventListener('click', () => this.handleSaveAndConnect());
    this.manualConnectBtn.addEventListener('click', () => this.handleManualTokenConnect());
    this.disconnectBtn.addEventListener('click', () => this.handleDisconnect());

    this.viewPills.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.pill');
      const view = btn?.dataset.view as 'my-drive' | 'shared' | 'all-media' | undefined;
      if (!view) return;
      this.cloudView = view;
      this.viewPills.querySelectorAll('.pill').forEach((p) => {
        p.classList.toggle('active', p === btn);
      });
      this.cloudStack = [
        {
          id: 'root',
          name: view === 'my-drive' ? '我的云端硬盘' : view === 'shared' ? '与我共享' : '全部媒体',
        },
      ];
      this.loadCloudFiles();
    });

    this.searchInput.addEventListener('input', () => {
      if (this.cloudSearchTimer !== null) window.clearTimeout(this.cloudSearchTimer);
      this.cloudSearchTimer = window.setTimeout(() => this.loadCloudFiles(), 320);
    });

    this.addAllCloudBtn.addEventListener('click', () => {
      const media = this.cloudFiles.filter((f) => !f.isFolder && f.kind);
      if (media.length === 0) {
        this.callbacks.onToast('当前目录没有可播放的照片或视频');
        return;
      }
      const items = media.map((f) => this.toCloudPlayable(f));
      this.callbacks.onAddItems(items, true);
      this.callbacks.onToast(`已添加 ${items.length} 个 Google Drive 媒体到播放列表`);
      this.close();
    });

    this.mountAddBtn.addEventListener('click', () => this.handleAddMount());
    this.mountPathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddMount();
      }
    });

    this.mountAddAllBtn.addEventListener('click', () => {
      if (!this.activeMountId) return;
      const media = this.mountEntries.filter((e) => !e.isFolder && e.kind);
      if (media.length === 0) {
        this.callbacks.onToast('当前目录没有可播放的照片或视频');
        return;
      }
      const items = media.map((e) => this.toMountPlayable(this.activeMountId!, e));
      this.callbacks.onAddItems(items, true);
      this.callbacks.onToast(`已添加 ${items.length} 个挂载目录媒体到播放列表`);
      this.close();
    });

    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data === 'object' && e.data.type === 'vrviewer-gdrive-oauth') {
        if (e.data.success) {
          this.callbacks.onToast('Google Drive 连接成功');
          this.refreshCloudStatus();
        } else {
          this.callbacks.onToast('Google Drive 授权未完成', 4000);
        }
      }
    });
  }

  public open(initialTab?: 'cloud' | 'mounts'): void {
    this.modal.classList.remove('hidden');
    if (initialTab) {
      this.switchTab(initialTab);
    }
    this.refreshCloudStatus();
    this.refreshMounts();
  }

  public close(): void {
    this.modal.classList.add('hidden');
  }

  public isOpen(): boolean {
    return !this.modal.classList.contains('hidden');
  }

  private switchTab(tab: 'cloud' | 'mounts'): void {
    const isCloud = tab === 'cloud';
    this.tabCloud.classList.toggle('active', isCloud);
    this.tabMounts.classList.toggle('active', !isCloud);
    this.panelCloud.classList.toggle('hidden', !isCloud);
    this.panelMounts.classList.toggle('hidden', isCloud);
  }

  private async refreshCloudStatus(): Promise<void> {
    try {
      const status = await fetchGDriveStatus();
      if (status.defaultRedirectUri) {
        this.redirectUriEl.textContent = status.defaultRedirectUri;
      }
      if (status.clientId && !this.clientIdInput.value) {
        this.clientIdInput.value = status.clientId;
      }

      if (status.connected) {
        this.authBox.classList.add('hidden');
        this.browserBox.classList.remove('hidden');
        this.accountLabel.textContent =
          status.email || status.displayName || '已连接 Google Drive';
        await this.loadCloudFiles();
      } else {
        this.authBox.classList.remove('hidden');
        this.browserBox.classList.add('hidden');
      }
    } catch (err) {
      this.authBox.classList.remove('hidden');
      this.browserBox.classList.add('hidden');
      this.callbacks.onToast(
        `无法连接 Bun 后端服务：${err instanceof Error ? err.message : '请使用 bun run dev 启动'}`,
        4500
      );
    }
  }

  private async handleSaveAndConnect(): Promise<void> {
    const clientId = this.clientIdInput.value.trim();
    const clientSecret = this.clientSecretInput.value.trim();
    if (!clientId || !clientSecret) {
      this.callbacks.onToast('请填写 Client ID 和 Client Secret');
      return;
    }

    try {
      this.saveConnectBtn.disabled = true;
      await saveGDriveCreds(clientId, clientSecret);
      const { url } = await fetchGDriveAuthUrl();
      window.open(url, 'vrviewer-gdrive-oauth', 'width=560,height=680');
    } catch (err) {
      this.callbacks.onToast(err instanceof Error ? err.message : '授权启动失败', 4500);
    } finally {
      this.saveConnectBtn.disabled = false;
    }
  }

  private async handleManualTokenConnect(): Promise<void> {
    const token = this.manualTokenInput.value.trim();
    if (!token) {
      this.callbacks.onToast('请输入 Access Token');
      return;
    }

    try {
      this.manualConnectBtn.disabled = true;
      await connectGDriveToken(token);
      this.manualTokenInput.value = '';
      this.callbacks.onToast('Google Drive 连接成功');
      await this.refreshCloudStatus();
    } catch (err) {
      this.callbacks.onToast(err instanceof Error ? err.message : '连接失败', 4500);
    } finally {
      this.manualConnectBtn.disabled = false;
    }
  }

  private async handleDisconnect(): Promise<void> {
    try {
      await disconnectGDriveAccount();
      this.cloudFiles = [];
      this.callbacks.onToast('已断开 Google Drive 连接');
      await this.refreshCloudStatus();
    } catch (err) {
      this.callbacks.onToast(err instanceof Error ? err.message : '断开失败');
    }
  }

  private async loadCloudFiles(append = false): Promise<void> {
    if (!append) {
      this.fileListEl.innerHTML = '<div class="drive-empty">正在读取 Google Drive 文件…</div>';
      this.cloudNextToken = undefined;
    }

    const currentFolder = this.cloudStack[this.cloudStack.length - 1];
    try {
      const res = await fetchGDriveFiles({
        folderId: currentFolder.id,
        view: this.cloudView,
        pageToken: append ? this.cloudNextToken : undefined,
        q: this.searchInput.value.trim() || undefined,
      });

      this.cloudFiles = append ? [...this.cloudFiles, ...res.files] : res.files;
      this.cloudNextToken = res.nextPageToken;
      this.renderCloudBreadcrumbs();
      this.renderCloudFiles();
    } catch (err) {
      this.fileListEl.innerHTML = `<div class="drive-empty">${
        err instanceof Error ? err.message : '加载失败'
      }</div>`;
    }
  }

  private renderCloudBreadcrumbs(): void {
    this.breadcrumbsEl.innerHTML = '';
    this.cloudStack.forEach((crumb, idx) => {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        this.breadcrumbsEl.appendChild(sep);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `crumb-btn ${idx === this.cloudStack.length - 1 ? 'active' : ''}`;
      btn.textContent = crumb.name;
      btn.addEventListener('click', () => {
        this.cloudStack = this.cloudStack.slice(0, idx + 1);
        this.loadCloudFiles();
      });
      this.breadcrumbsEl.appendChild(btn);
    });
  }

  private toCloudPlayable(file: GDriveFileItem): DrivePlayableItem {
    const kind: MediaKind = file.kind ?? 'image';
    const format = detectProjectionFormat(file.name, file.width ?? 0, file.height ?? 0);
    return {
      id: `gdrive-${file.id}`,
      name: file.name,
      url: getGDriveStreamUrl(file.id),
      kind,
      format,
      sourceLabel: 'Google Drive',
      width: file.width,
      height: file.height,
    };
  }

  private renderCloudFiles(): void {
    this.fileListEl.innerHTML = '';
    if (this.cloudFiles.length === 0) {
      this.fileListEl.innerHTML = '<div class="drive-empty">当前目录没有照片、视频或子文件夹</div>';
      return;
    }

    for (const file of this.cloudFiles) {
      const row = document.createElement('div');
      row.className = 'drive-file-row';

      const icon = document.createElement('span');
      icon.className = 'drive-file-icon';
      icon.textContent = file.isFolder ? '📁' : file.kind === 'video' ? '🎬' : '🖼️';

      const info = document.createElement('div');
      info.className = 'drive-file-info';

      const name = document.createElement('div');
      name.className = 'drive-file-name';
      name.textContent = file.name;

      const meta = document.createElement('div');
      meta.className = 'drive-file-meta';
      const parts: string[] = [];
      if (file.isFolder) {
        parts.push('文件夹');
      } else {
        parts.push(file.kind === 'video' ? '视频' : '照片');
        if (file.width && file.height) parts.push(`${file.width}×${file.height}`);
        const sz = formatBytes(file.size);
        if (sz) parts.push(sz);
      }
      meta.textContent = parts.join(' · ');

      info.appendChild(name);
      info.appendChild(meta);

      row.appendChild(icon);
      row.appendChild(info);

      if (file.isFolder) {
        row.addEventListener('click', () => {
          this.cloudStack.push({ id: file.id, name: file.name });
          this.loadCloudFiles();
        });
      } else {
        row.addEventListener('click', () => {
          this.callbacks.onPlayItem(this.toCloudPlayable(file));
          this.close();
        });

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-ghost btn-xs';
        addBtn.textContent = '+ 队列';
        addBtn.title = '加入播放列表';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.callbacks.onAddItems([this.toCloudPlayable(file)], false);
          this.callbacks.onToast(`已加入播放列表：${file.name}`);
        });
        row.appendChild(addBtn);
      }

      this.fileListEl.appendChild(row);
    }

    if (this.cloudNextToken) {
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'btn btn-ghost btn-sm drive-load-more';
      moreBtn.textContent = '加载更多文件…';
      moreBtn.addEventListener('click', () => this.loadCloudFiles(true));
      this.fileListEl.appendChild(moreBtn);
    }
  }

  // --- Local / Mounted Directories ---
  private async refreshMounts(): Promise<void> {
    try {
      const res = await fetchMounts();
      this.mounts = res.mounts;
      this.detectedMounts = res.detected;
      this.renderDetectedMounts();
      this.renderMountList();

      if (!this.activeMountId || !this.mounts.some((m) => m.id === this.activeMountId)) {
        this.activeMountId = this.mounts[0]?.id ?? null;
        this.mountRelPath = '';
      }

      if (this.activeMountId) {
        await this.loadMountDir(this.activeMountId, this.mountRelPath);
      } else {
        this.mountBreadcrumbsEl.innerHTML = '';
        this.mountFileListEl.innerHTML =
          '<div class="drive-empty">请在上方输入路径，或点击检测到的 Google Drive 目录进行挂载</div>';
      }
    } catch (err) {
      this.mountFileListEl.innerHTML = `<div class="drive-empty">${
        err instanceof Error ? err.message : '读取挂载目录失败'
      }</div>`;
    }
  }

  private renderDetectedMounts(): void {
    const unmounted = this.detectedMounts.filter((d) => !d.alreadyMounted);
    if (unmounted.length === 0) {
      this.mountDetectedBar.classList.add('hidden');
      this.mountDetectedBar.innerHTML = '';
      return;
    }

    this.mountDetectedBar.classList.remove('hidden');
    this.mountDetectedBar.innerHTML = '<span class="detected-label">检测到本机 Google Drive：</span>';

    for (const d of unmounted) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary btn-xs';
      btn.textContent = `+ 挂载 ${d.name}`;
      btn.addEventListener('click', async () => {
        try {
          const m = await createMount(d.path, d.name);
          this.activeMountId = m.id;
          this.mountRelPath = '';
          this.callbacks.onToast(`已挂载：${m.name}`);
          await this.refreshMounts();
        } catch (err) {
          this.callbacks.onToast(err instanceof Error ? err.message : '挂载失败');
        }
      });
      this.mountDetectedBar.appendChild(btn);
    }
  }

  private async handleAddMount(): Promise<void> {
    const path = this.mountPathInput.value.trim();
    if (!path) {
      this.callbacks.onToast('请输入目录路径');
      return;
    }

    try {
      this.mountAddBtn.disabled = true;
      const mount = await createMount(path);
      this.mountPathInput.value = '';
      this.activeMountId = mount.id;
      this.mountRelPath = '';
      this.callbacks.onToast(`已挂载目录：${mount.name}`);
      await this.refreshMounts();
    } catch (err) {
      this.callbacks.onToast(err instanceof Error ? err.message : '挂载失败', 4500);
    } finally {
      this.mountAddBtn.disabled = false;
    }
  }

  private renderMountList(): void {
    this.mountListEl.innerHTML = '';
    if (this.mounts.length === 0) {
      this.mountListEl.innerHTML = '<div class="drive-empty-sm">暂无挂载目录</div>';
      return;
    }

    for (const m of this.mounts) {
      const row = document.createElement('div');
      row.className = `mount-item ${m.id === this.activeMountId ? 'active' : ''}`;
      row.addEventListener('click', () => {
        this.activeMountId = m.id;
        this.mountRelPath = '';
        this.renderMountList();
        this.loadMountDir(m.id, '');
      });

      const title = document.createElement('div');
      title.className = 'mount-item-name';
      title.textContent = `${m.kind === 'gdrive-desktop' ? '☁️' : '📁'} ${m.name}`;
      title.title = m.path;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-icon-sm';
      delBtn.textContent = '✕';
      delBtn.title = '取消挂载';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteMount(m.id);
        await this.refreshMounts();
      });

      row.appendChild(title);
      row.appendChild(delBtn);
      this.mountListEl.appendChild(row);
    }
  }

  private async loadMountDir(mountId: string, relPath: string): Promise<void> {
    this.mountFileListEl.innerHTML = '<div class="drive-empty">正在读取目录…</div>';
    try {
      const res = await browseMountDir(mountId, relPath);
      this.mountRelPath = res.currentPath;
      this.mountEntries = res.entries;
      this.renderMountBreadcrumbs(res.mount, res.currentPath);
      this.renderMountFiles(mountId);
    } catch (err) {
      this.mountFileListEl.innerHTML = `<div class="drive-empty">${
        err instanceof Error ? err.message : '读取目录失败'
      }</div>`;
    }
  }

  private renderMountBreadcrumbs(mount: MountInfo, relPath: string): void {
    this.mountBreadcrumbsEl.innerHTML = '';
    const segments = relPath ? relPath.split('/').filter(Boolean) : [];
    const crumbs = [{ name: mount.name, path: '' }];
    let acc = '';
    for (const seg of segments) {
      acc = acc ? `${acc}/${seg}` : seg;
      crumbs.push({ name: seg, path: acc });
    }

    crumbs.forEach((c, idx) => {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        this.mountBreadcrumbsEl.appendChild(sep);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `crumb-btn ${idx === crumbs.length - 1 ? 'active' : ''}`;
      btn.textContent = c.name;
      btn.addEventListener('click', () => this.loadMountDir(mount.id, c.path));
      this.mountBreadcrumbsEl.appendChild(btn);
    });
  }

  private toMountPlayable(mountId: string, entry: MountBrowseEntry): DrivePlayableItem {
    const kind: MediaKind = entry.kind ?? 'image';
    const format = detectProjectionFormat(entry.name, 0, 0);
    return {
      id: `mount-${mountId}-${entry.path}`,
      name: entry.name,
      url: getMountStreamUrl(mountId, entry.path),
      kind,
      format,
      sourceLabel: '挂载目录',
    };
  }

  private renderMountFiles(mountId: string): void {
    this.mountFileListEl.innerHTML = '';
    if (this.mountEntries.length === 0) {
      this.mountFileListEl.innerHTML = '<div class="drive-empty">当前目录没有照片、视频或子文件夹</div>';
      return;
    }

    for (const entry of this.mountEntries) {
      const row = document.createElement('div');
      row.className = 'drive-file-row';

      const icon = document.createElement('span');
      icon.className = 'drive-file-icon';
      icon.textContent = entry.isFolder ? '📁' : entry.kind === 'video' ? '🎬' : '🖼️';

      const info = document.createElement('div');
      info.className = 'drive-file-info';

      const name = document.createElement('div');
      name.className = 'drive-file-name';
      name.textContent = entry.name;

      const meta = document.createElement('div');
      meta.className = 'drive-file-meta';
      if (entry.isFolder) {
        meta.textContent = '文件夹';
      } else {
        const sz = formatBytes(entry.size);
        meta.textContent = [entry.kind === 'video' ? '视频' : '照片', sz].filter(Boolean).join(' · ');
      }

      info.appendChild(name);
      info.appendChild(meta);
      row.appendChild(icon);
      row.appendChild(info);

      if (entry.isFolder) {
        row.addEventListener('click', () => this.loadMountDir(mountId, entry.path));
      } else {
        row.addEventListener('click', () => {
          this.callbacks.onPlayItem(this.toMountPlayable(mountId, entry));
          this.close();
        });

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-ghost btn-xs';
        addBtn.textContent = '+ 队列';
        addBtn.title = '加入播放列表';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.callbacks.onAddItems([this.toMountPlayable(mountId, entry)], false);
          this.callbacks.onToast(`已加入播放列表：${entry.name}`);
        });
        row.appendChild(addBtn);
      }

      this.mountFileListEl.appendChild(row);
    }
  }
}

