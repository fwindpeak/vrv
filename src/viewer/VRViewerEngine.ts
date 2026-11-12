import * as THREE from 'three';
import type { MediaKind, ProjectionFormat } from '../types';

export type UVRegion = 'full' | 'left-half' | 'right-half' | 'top-half' | 'bottom-half';

export interface EngineCallbacks {
  onXRStateChange?: (inXR: boolean) => void;
  onMediaLoaded?: (width: number, height: number) => void;
  onMediaError?: (message: string) => void;
  onVideoStateChange?: () => void;
}

export class VRViewerEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mediaGroup: THREE.Group;

  private currentTexture: THREE.Texture | null = null;
  private currentVideo: HTMLVideoElement | null = null;

  private format: ProjectionFormat = '2d';
  private mediaWidth = 1920;
  private mediaHeight = 1080;
  private swapEyes = false;

  // 2D browser camera / pan-zoom state
  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private panX = 0;
  private panY = 0;
  private targetPanX = 0;
  private targetPanY = 0;
  private fov = 75;
  private targetFov = 75;

  // Interaction state
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private keysPressed = new Set<string>();
  private xrSession: XRSession | null = null;
  private callbacks: EngineCallbacks;
  private disposed = false;

  // Subtle ambient starfield/grid for VR180/2D dark space
  private backGrid: THREE.LineSegments | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // In 2D browser mode, show layer 0 (mono) and layer 1 (left eye)
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);
    this.camera.layers.disable(2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.mediaGroup = new THREE.Group();
    this.scene.add(this.mediaGroup);

    this.createSubtleFloorGrid();
    this.setupXRControllers();
    this.bindEvents();

    this.renderer.setAnimationLoop(this.animate);
  }

  private createSubtleFloorGrid(): void {
    const grid = new THREE.GridHelper(30, 30, 0x1e293b, 0x111827);
    grid.position.y = -3.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    this.backGrid = grid;
    this.scene.add(grid);
  }

  private setupXRControllers(): void {
    const onSelect = () => {
      if (this.currentVideo) {
        this.togglePlayPause();
      }
    };
    const c0 = this.renderer.xr.getController(0);
    const c1 = this.renderer.xr.getController(1);
    c0.addEventListener('select', onSelect);
    c1.addEventListener('select', onSelect);
    this.scene.add(c0, c1);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;

    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || this.renderer.xr.isPresenting) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.is2DFlatFormat(this.format)) {
      const panScale = (this.fov / 75) * 0.006;
      this.targetPanX -= dx * panScale;
      this.targetPanY += dy * panScale;
      this.clampPan();
    } else {
      const sensitivity = (this.fov / 75) * 0.0032;
      this.targetYaw -= dx * sensitivity;
      this.targetPitch += dy * sensitivity;
      this.clampAngles();
    }
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.renderer.xr.isPresenting) return;
    this.targetFov = THREE.MathUtils.clamp(this.targetFov + e.deltaY * 0.05, 18, 105);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.keysPressed.add(e.code);

    if (e.code === 'KeyR') {
      this.resetView();
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      this.targetFov = THREE.MathUtils.clamp(this.targetFov - 6, 18, 105);
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      this.targetFov = THREE.MathUtils.clamp(this.targetFov + 6, 18, 105);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
  };

  private is2DFlatFormat(fmt: ProjectionFormat): boolean {
    return fmt === '2d' || fmt === '2d-sbs' || fmt === '2d-tb';
  }

  private is180Format(fmt: ProjectionFormat): boolean {
    return fmt === 'vr180-sbs' || fmt === 'vr180-tb' || fmt === 'vr180-mono';
  }

  private clampAngles(): void {
    const maxPitch = Math.PI / 2 - 0.03;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -maxPitch, maxPitch);

    if (this.is180Format(this.format)) {
      const maxYaw = Math.PI * 0.52;
      this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, -maxYaw, maxYaw);
    }
  }

  private clampPan(): void {
    this.targetPanX = THREE.MathUtils.clamp(this.targetPanX, -3.5, 3.5);
    this.targetPanY = THREE.MathUtils.clamp(this.targetPanY, -2.5, 2.5);
  }

  public resetView(): void {
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;
    this.targetFov = 75;
  }

  public async loadMedia(
    url: string,
    kind: MediaKind,
    format: ProjectionFormat
  ): Promise<void> {
    this.clearCurrentMedia();
    this.format = format;
    this.resetView();

    if (kind === 'image') {
      await this.loadImage(url);
    } else {
      await this.loadVideo(url);
    }
  }

  private loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith('blob:') && !url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (this.disposed) return;
        this.mediaWidth = img.naturalWidth || 1920;
        this.mediaHeight = img.naturalHeight || 1080;

        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;

        this.currentTexture = tex;
        this.rebuildGeometry();
        this.callbacks.onMediaLoaded?.(this.mediaWidth, this.mediaHeight);
        resolve();
      };

      img.onerror = () => {
        const msg =
          '图片加载失败：请检查 URL 是否有效，或目标服务器是否允许跨域访问（CORS）。';
        this.callbacks.onMediaError?.(msg);
        reject(new Error(msg));
      };

      img.src = url;
    });
  }

  private loadVideo(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      if (!url.startsWith('blob:') && !url.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      video.playsInline = true;
      video.loop = true;
      video.preload = 'auto';
      video.muted = false;

      const onLoadedMetadata = () => {
        if (this.disposed) return;
        this.currentVideo = video;
        this.mediaWidth = video.videoWidth || 1920;
        this.mediaHeight = video.videoHeight || 1080;

        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        this.currentTexture = tex;
        this.rebuildGeometry();

        video.addEventListener('play', this.emitVideoState);
        video.addEventListener('pause', this.emitVideoState);
        video.addEventListener('timeupdate', this.emitVideoState);
        video.addEventListener('volumechange', this.emitVideoState);
        video.addEventListener('ended', this.emitVideoState);

        // Try autoplay; fallback to muted autoplay if browser blocks unmuted playback
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {
            // User can manually press play
          });
        });

        this.callbacks.onMediaLoaded?.(this.mediaWidth, this.mediaHeight);
        this.emitVideoState();
        resolve();
      };

      const onError = () => {
        const msg =
          '视频加载失败：请检查视频格式（建议 MP4/WebM H.264/HEVC）或目标服务器的 CORS 跨域权限。';
        this.callbacks.onMediaError?.(msg);
        reject(new Error(msg));
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.src = url;
      video.load();
    });
  }

  private emitVideoState = (): void => {
    this.callbacks.onVideoStateChange?.();
  };

  public setFormat(format: ProjectionFormat): void {
    if (this.format === format) return;
    this.format = format;
    this.resetView();
    if (this.currentTexture) {
      this.rebuildGeometry();
    }
  }

  public setSwapEyes(swap: boolean): void {
    if (this.swapEyes === swap) return;
    this.swapEyes = swap;
    if (this.currentTexture) {
      this.rebuildGeometry();
    }
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.currentVideo;
  }

  public togglePlayPause(): void {
    if (!this.currentVideo) return;
    if (this.currentVideo.paused) {
      this.currentVideo.play().catch(() => {});
    } else {
      this.currentVideo.pause();
    }
  }

  public seekBy(seconds: number): void {
    if (!this.currentVideo || !Number.isFinite(this.currentVideo.duration)) return;
    this.currentVideo.currentTime = THREE.MathUtils.clamp(
      this.currentVideo.currentTime + seconds,
      0,
      this.currentVideo.duration
    );
  }

  private clearGeometryOnly(): void {
    while (this.mediaGroup.children.length > 0) {
      const child = this.mediaGroup.children[0];
      this.mediaGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  private clearCurrentMedia(): void {
    this.clearGeometryOnly();

    if (this.currentTexture) {
      this.currentTexture.dispose();
      this.currentTexture = null;
    }

    if (this.currentVideo) {
      this.currentVideo.removeEventListener('play', this.emitVideoState);
      this.currentVideo.removeEventListener('pause', this.emitVideoState);
      this.currentVideo.removeEventListener('timeupdate', this.emitVideoState);
      this.currentVideo.removeEventListener('volumechange', this.emitVideoState);
      this.currentVideo.removeEventListener('ended', this.emitVideoState);
      this.currentVideo.pause();
      this.currentVideo.removeAttribute('src');
      this.currentVideo.load();
      this.currentVideo = null;
    }
  }

  private rebuildGeometry(): void {
    this.clearGeometryOnly();
    if (!this.currentTexture) return;

    const tex = this.currentTexture;
    const fmt = this.format;

    if (this.backGrid) {
      this.backGrid.visible = this.is2DFlatFormat(fmt) || this.is180Format(fmt);
    }

    const leftLayer = this.swapEyes ? 2 : 1;
    const rightLayer = this.swapEyes ? 1 : 2;

    if (fmt === '2d') {
      const mesh = this.createFlatScreenMesh(tex, 'full', this.mediaWidth / this.mediaHeight);
      mesh.layers.set(0);
      this.mediaGroup.add(mesh);
      return;
    }

    if (fmt === '2d-sbs') {
      const aspect = (this.mediaWidth * 0.5) / this.mediaHeight;
      const leftMesh = this.createFlatScreenMesh(tex, 'left-half', aspect);
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createFlatScreenMesh(tex, 'right-half', aspect);
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
      return;
    }

    if (fmt === '2d-tb') {
      const aspect = this.mediaWidth / (this.mediaHeight * 0.5);
      const leftMesh = this.createFlatScreenMesh(tex, 'top-half', aspect);
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createFlatScreenMesh(tex, 'bottom-half', aspect);
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
      return;
    }

    if (fmt === 'vr180-mono') {
      const mesh = this.createSphereMesh(tex, Math.PI, Math.PI, 'full');
      mesh.layers.set(0);
      this.mediaGroup.add(mesh);
      return;
    }

    if (fmt === 'vr180-sbs') {
      const leftMesh = this.createSphereMesh(tex, Math.PI, Math.PI, 'left-half');
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createSphereMesh(tex, Math.PI, Math.PI, 'right-half');
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
      return;
    }

    if (fmt === 'vr180-tb') {
      const leftMesh = this.createSphereMesh(tex, Math.PI, Math.PI, 'top-half');
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createSphereMesh(tex, Math.PI, Math.PI, 'bottom-half');
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
      return;
    }

    if (fmt === '360-mono') {
      const mesh = this.createSphereMesh(tex, Math.PI / 2, Math.PI * 2, 'full');
      mesh.layers.set(0);
      this.mediaGroup.add(mesh);
      return;
    }

    if (fmt === '360-tb') {
      const leftMesh = this.createSphereMesh(tex, Math.PI / 2, Math.PI * 2, 'top-half');
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createSphereMesh(tex, Math.PI / 2, Math.PI * 2, 'bottom-half');
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
      return;
    }

    if (fmt === '360-sbs') {
      const leftMesh = this.createSphereMesh(tex, Math.PI / 2, Math.PI * 2, 'left-half');
      leftMesh.layers.set(leftLayer);
      const rightMesh = this.createSphereMesh(tex, Math.PI / 2, Math.PI * 2, 'right-half');
      rightMesh.layers.set(rightLayer);
      this.mediaGroup.add(leftMesh, rightMesh);
    }
  }

  private createFlatScreenMesh(
    tex: THREE.Texture,
    uvRegion: UVRegion,
    aspect: number
  ): THREE.Mesh {
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
    const distance = 4.0;
    // Size plane to fit comfortably inside 75deg FOV
    const maxHeight = 3.8;
    const maxWidth = 6.4;
    let height = maxHeight;
    let width = height * safeAspect;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / safeAspect;
    }

    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    this.remapUVs(geometry, uvRegion);

    const material = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.FrontSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -distance);
    return mesh;
  }

  private createSphereMesh(
    tex: THREE.Texture,
    phiStart: number,
    phiLength: number,
    uvRegion: UVRegion
  ): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(100, 96, 64, phiStart, phiLength, 0, Math.PI);
    geometry.scale(-1, 1, 1);
    this.remapUVs(geometry, uvRegion);

    const material = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.FrontSide,
      toneMapped: false,
    });
    return new THREE.Mesh(geometry, material);
  }

  private remapUVs(geometry: THREE.BufferGeometry, region: UVRegion): void {
    if (region === 'full') return;
    const uvAttr = geometry.attributes.uv;
    if (!uvAttr) return;

    for (let i = 0; i < uvAttr.count; i++) {
      let u = uvAttr.getX(i);
      let v = uvAttr.getY(i);

      if (region === 'left-half') {
        u = u * 0.5;
      } else if (region === 'right-half') {
        u = u * 0.5 + 0.5;
      } else if (region === 'top-half') {
        v = v * 0.5 + 0.5;
      } else if (region === 'bottom-half') {
        v = v * 0.5;
      }

      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;
  }

  public async isXRSupported(): Promise<boolean> {
    if (!('xr' in navigator) || !navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported('immersive-vr');
    } catch {
      return false;
    }
  }

  public async enterVR(): Promise<void> {
    if (!navigator.xr) {
      throw new Error('当前浏览器不支持 WebXR。');
    }
    if (this.xrSession) return;

    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });
    this.xrSession = session;
    session.addEventListener('end', () => {
      this.xrSession = null;
      this.callbacks.onXRStateChange?.(false);
    });

    await this.renderer.xr.setSession(session);
    this.callbacks.onXRStateChange?.(true);
  }

  public async exitVR(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
    }
  }

  public isInVR(): boolean {
    return this.xrSession !== null;
  }

  private processKeyboard(): void {
    if (this.renderer.xr.isPresenting || this.keysPressed.size === 0) return;

    const rotSpeed = 0.025 * (this.fov / 75);
    const panSpeed = 0.05 * (this.fov / 75);

    const up = this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW');
    const down = this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS');
    const left = this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA');
    const right = this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD');

    if (this.is2DFlatFormat(this.format)) {
      if (up) this.targetPanY += panSpeed;
      if (down) this.targetPanY -= panSpeed;
      if (left) this.targetPanX -= panSpeed;
      if (right) this.targetPanX += panSpeed;
      this.clampPan();
    } else {
      if (up) this.targetPitch += rotSpeed;
      if (down) this.targetPitch -= rotSpeed;
      if (left) this.targetYaw -= rotSpeed;
      if (right) this.targetYaw += rotSpeed;
      this.clampAngles();
    }
  }

  private animate = (): void => {
    if (this.disposed) return;

    if (!this.renderer.xr.isPresenting) {
      this.processKeyboard();

      const damp = 0.16;
      this.yaw += (this.targetYaw - this.yaw) * damp;
      this.pitch += (this.targetPitch - this.pitch) * damp;
      this.panX += (this.targetPanX - this.panX) * damp;
      this.panY += (this.targetPanY - this.panY) * damp;
      this.fov += (this.targetFov - this.fov) * damp;

      if (Math.abs(this.camera.fov - this.fov) > 0.01) {
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
      }

      if (this.is2DFlatFormat(this.format)) {
        this.camera.position.set(this.panX, this.panY, 0);
        this.camera.lookAt(this.panX, this.panY, -4);
      } else {
        this.camera.position.set(0, 0, 0);
        const lookX = Math.sin(this.yaw) * Math.cos(this.pitch);
        const lookY = Math.sin(this.pitch);
        const lookZ = -Math.cos(this.yaw) * Math.cos(this.pitch);
        this.camera.lookAt(lookX, lookY, lookZ);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.unbindEvents();
    this.clearCurrentMedia();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
