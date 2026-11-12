export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'vrviewer-lang';

const zh = {
  'app.title': 'VRViewer — 2D / VR180 / 360° 沉浸式媒体播放器',
  'drop.title': '松开即可添加到播放列表',
  'drop.sub': '支持 2D / VR180 / 360° 照片与视频（可多选）',

  'welcome.badge': 'WebXR · Three.js · 纯前端',
  'welcome.title': 'VRViewer 沉浸式媒体浏览器',
  'welcome.desc':
    '支持 <strong>2D 照片/视频</strong>、<strong>VR180 双目</strong>、<strong>360° 全景</strong>。普通浏览器默认以平面/单目视角流畅浏览；在 Meta Quest 等 XR 浏览器中可一键进入立体 VR 模式。',
  'welcome.localBtn': '选择本地文件',
  'welcome.gdriveBtn': '挂载 Google Drive',
  'welcome.urlBtn': '通过 URL 观看',
  'welcome.sampleBtn': '加载内置测试图',
  'welcome.tipDrag': '🖱️ 拖拽画面环顾 / 平移',
  'welcome.tipZoom': '🔍 滚轮缩放视角',
  'welcome.tipKeys': '⌨️ WASD / 方向键移动 · R 重置',
  'welcome.tipDrop': '📦 支持直接拖放文件到窗口',

  'hud.noMedia': '未加载媒体',
  'hud.addLocal': '+ 本地文件',
  'hud.addLocalTitle': '添加本地照片或视频',
  'hud.addGDrive': '+ Google Drive',
  'hud.addGDriveTitle': '挂载并浏览 Google Drive 文件',
  'hud.addUrl': '+ URL 链接',
  'hud.addUrlTitle': '输入图片或视频 URL',
  'hud.enterVR': '进入 VR 模式',
  'hud.exitVR': '退出 VR 模式',
  'hud.enterVRTitle': '在支持的头显浏览器中进入 WebXR VR 模式',
  'hud.enterVRUnsupportedTitle':
    '当前浏览器未检测到 WebXR 头显（在 Meta Quest 浏览器中可直接进入 VR）',
  'hud.playlistTitle': '播放列表',
  'hud.toggleHudTitle': '隐藏/显示界面 (H)',
  'hud.restoreHud': '显示控制栏 (H)',
  'hud.restoreHudTitle': '显示控制栏 (H)',
  'hud.langBtn': 'EN',
  'hud.langTitle': 'Switch to English',
  'hud.themeToLightTitle': '切换到亮色模式',
  'hud.themeToDarkTitle': '切换到暗色模式',

  'video.playPauseTitle': '播放/暂停 (空格)',
  'video.seekLabel': '视频进度',
  'video.muteTitle': '静音/取消静音 (M)',
  'video.volumeLabel': '音量',

  'controls.projection': '投影模式',
  'controls.swapEyes': '交换左右眼',
  'controls.swapEyesTitle': '若双目立体画面左右眼颠倒，可勾选此项交换',
  'controls.resetView': '重置视角 (R)',
  'controls.resetViewTitle': '重置视角与缩放 (R)',
  'controls.fullscreen': '全屏 (F)',
  'controls.fullscreenTitle': '全屏切换 (F)',
  'controls.helpTitle': '快捷键与使用说明 (?)',

  'playlist.heading': '媒体列表',
  'playlist.samples': '测试图',
  'playlist.empty': '列表为空，点击上方添加本地文件或 URL',
  'playlist.removeTitle': '从列表中移除',
  'playlist.localTag': '本地',

  'media.video': '视频',
  'media.image': '照片',

  'urlModal.title': '添加在线媒体 URL',
  'urlModal.urlLabel': '媒体链接 (图片或视频直链)',
  'urlModal.urlPlaceholder': 'https://example.com/photo_vr180.jpg 或 video.mp4',
  'urlModal.kindLabel': '媒体类型',
  'urlModal.kindAuto': '自动识别',
  'urlModal.kindImage': '照片 (Image)',
  'urlModal.kindVideo': '视频 (Video)',
  'urlModal.formatLabel': '投影格式',
  'urlModal.formatAuto': '自动识别',
  'urlModal.corsNote':
    '提示：纯前端 WebGL 渲染远程图片/视频纹理时，目标服务器需开启 <code>Access-Control-Allow-Origin: *</code> (CORS) 响应头。',
  'urlModal.cancel': '取消',
  'urlModal.submit': '打开观看',

  'helpModal.title': '操作指南与格式说明',
  'helpModal.basicTitle': '普通 2D 浏览器控制',
  'helpModal.basicList': `
    <li><strong>鼠标左键拖拽</strong>：360° / VR180 模式下旋转视角；2D 模式下平移画面</li>
    <li><strong>鼠标滚轮 / + - 键</strong>：缩放视场角 (FOV)</li>
    <li><strong>W A S D / 方向键</strong>：平滑移动视角方向或平移画面</li>
    <li><strong>空格键</strong>：播放 / 暂停视频</li>
    <li><strong>← / →（视频聚焦或 J / L）</strong>：快退 / 快进 5 秒（J/L）</li>
    <li><strong>R 键</strong>：重置视角与缩放</li>
    <li><strong>F 键</strong>：全屏切换 · <strong>H 键</strong>：隐藏/显示控制栏</li>
  `,
  'helpModal.vrTitle': '双目立体与 Quest VR 模式',
  'helpModal.vrList': `
    <li>在普通 2D 显示器上观看 <strong>VR180 SBS / TB</strong> 或 <strong>360° 立体</strong> 时，默认提取<strong>左眼单目视角</strong>正常渲染，不会出现重影分屏。</li>
    <li>在 Meta Quest 等支持 <strong>WebXR</strong> 的浏览器中点击右上角「进入 VR 模式」，将自动启用左右眼独立立体渲染（头部 3DoF/6DoF 追踪，扳机键可控制视频播放/暂停）。</li>
  `,

  'gdriveModal.title': 'Google Drive 挂载与浏览',
  'gdriveModal.tabCloud': '☁️ Google Drive 云端 (OAuth)',
  'gdriveModal.tabMounts': '💾 本地挂载目录 (Drive Desktop / rclone)',
  'gdriveModal.oauthTitle': '方式 1：Google OAuth 2.0 授权（推荐，可自动刷新）',
  'gdriveModal.oauthHint':
    '在 Google Cloud Console 创建 OAuth 2.0 客户端（Web 应用），将下方回调地址加入「已获授权的重定向 URI」：',
  'gdriveModal.copy': '复制',
  'gdriveModal.clientId': 'Client ID',
  'gdriveModal.clientSecret': 'Client Secret',
  'gdriveModal.saveConnect': '保存并授权连接 Google Drive',
  'gdriveModal.tokenTitle': '方式 2：使用 Access Token 快速连接',
  'gdriveModal.tokenHint': '若已有 OAuth Access Token（如从 OAuth Playground 获取），可直接粘贴连接：',
  'gdriveModal.accessToken': 'Access Token',
  'gdriveModal.connectNow': '立即连接',
  'gdriveModal.connectedDefault': '已连接 Google Drive',
  'gdriveModal.disconnect': '断开',
  'gdriveModal.viewMyDrive': '我的云端硬盘',
  'gdriveModal.viewShared': '与我共享',
  'gdriveModal.viewAllMedia': '全部媒体',
  'gdriveModal.searchPlaceholder': '搜索文件名…',
  'gdriveModal.addAll': '+ 全部加入播放列表',
  'gdriveModal.mountPlaceholder':
    '输入挂载目录路径，如 ~/Library/CloudStorage/GoogleDrive-.../My Drive 或 /Volumes/GoogleDrive',
  'gdriveModal.mountAdd': '挂载目录',
  'gdriveModal.mountedDirs': '已挂载目录',

  'drive.copiedRedirect': '已复制回调地址',
  'drive.copyFailed': '复制失败，请手动复制',
  'drive.noMediaInDir': '当前目录没有可播放的照片或视频',
  'drive.addedCloudMedia': '已添加 {count} 个 Google Drive 媒体到播放列表',
  'drive.addedMountMedia': '已添加 {count} 个挂载目录媒体到播放列表',
  'drive.connected': 'Google Drive 连接成功',
  'drive.oauthIncomplete': 'Google Drive 授权未完成',
  'drive.backendError': '无法连接 Bun 后端服务：{msg}',
  'drive.backendFallback': '请使用 bun run dev 启动',
  'drive.enterCreds': '请填写 Client ID 和 Client Secret',
  'drive.authStartFailed': '授权启动失败',
  'drive.enterToken': '请输入 Access Token',
  'drive.connectFailed': '连接失败',
  'drive.disconnected': '已断开 Google Drive 连接',
  'drive.disconnectFailed': '断开失败',
  'drive.loadingCloud': '正在读取 Google Drive 文件…',
  'drive.loadFailed': '加载失败',
  'drive.emptyDir': '当前目录没有照片、视频或子文件夹',
  'drive.folder': '文件夹',
  'drive.addQueue': '+ 队列',
  'drive.addQueueTitle': '加入播放列表',
  'drive.addedSingle': '已加入播放列表：{name}',
  'drive.loadMore': '加载更多文件…',
  'drive.mountEmptyHint': '请在上方输入路径，或点击检测到的 Google Drive 目录进行挂载',
  'drive.mountReadFailed': '读取挂载目录失败',
  'drive.detectedLabel': '检测到本机 Google Drive：',
  'drive.mountBtnPrefix': '+ 挂载 {name}',
  'drive.mountedToast': '已挂载：{name}',
  'drive.mountFailed': '挂载失败',
  'drive.enterPath': '请输入目录路径',
  'drive.mountedDirToast': '已挂载目录：{name}',
  'drive.noMounts': '暂无挂载目录',
  'drive.unmountTitle': '取消挂载',
  'drive.loadingDir': '正在读取目录…',
  'drive.readDirFailed': '读取目录失败',
  'drive.mountSourceLabel': '挂载目录',

  'toast.noSupportedFiles': '未检测到支持的照片或视频文件',
  'toast.invalidUrl': '请输入有效的 http:// 或 https:// 链接',
  'toast.noWebXR':
    '当前浏览器未检测到 WebXR 设备。请在 Meta Quest 浏览器或连接 PCVR 头显的 Chrome/Edge 中打开以进入 VR 模式。',
  'toast.vrEnterFailed': '无法进入 VR 模式：{msg}',
  'toast.unknownError': '未知错误',

  'engine.imageLoadError':
    '图片加载失败：请检查 URL 是否有效，或目标服务器是否允许跨域访问（CORS）。',
  'engine.videoLoadError':
    '视频加载失败：请检查视频格式（建议 MP4/WebM H.264/HEVC）或目标服务器的 CORS 跨域权限。',
  'engine.webxrUnsupported': '当前浏览器不支持 WebXR。',
  'api.requestFailed': '请求失败 ({status})',

  'format.2d.label': '2D 平面',
  'format.2d.short': '2D',
  'format.2d.desc': '普通平面照片或视频',
  'format.vr180-sbs.label': 'VR180 左右双目 (SBS)',
  'format.vr180-sbs.short': 'VR180 SBS',
  'format.vr180-sbs.desc': '180° 半球立体（左眼左半幅、右眼右半幅）',
  'format.vr180-tb.label': 'VR180 上下双目 (TB)',
  'format.vr180-tb.short': 'VR180 TB',
  'format.vr180-tb.desc': '180° 半球立体（左眼上半幅、右眼下半幅）',
  'format.vr180-mono.label': 'VR180 单目',
  'format.vr180-mono.short': 'VR180 单目',
  'format.vr180-mono.desc': '180° 半球单视角全景',
  'format.360-mono.label': '360° 全景单目',
  'format.360-mono.short': '360°',
  'format.360-mono.desc': '360° 等距柱状投影全景（2:1）',
  'format.360-tb.label': '360° 上下双目 (TB)',
  'format.360-tb.short': '360° TB',
  'format.360-tb.desc': '360° 立体全景（上下分屏 1:1）',
  'format.360-sbs.label': '360° 左右双目 (SBS)',
  'format.360-sbs.short': '360° SBS',
  'format.360-sbs.desc': '360° 立体全景（左右分屏 4:1）',
  'format.2d-sbs.label': '3D 巨幕左右 (SBS)',
  'format.2d-sbs.short': '3D SBS',
  'format.2d-sbs.desc': '平面 3D 电影/照片（左右半幅）',
  'format.2d-tb.label': '3D 巨幕上下 (TB)',
  'format.2d-tb.short': '3D TB',
  'format.2d-tb.desc': '平面 3D 电影/照片（上下半幅）',

  'sample.vr180Title': 'VR180 立体测试图',
  'sample.vr180Left': '左眼视角 (Left Eye)',
  'sample.vr180Right': '右眼视角 (Right Eye)',
  'sample.vr180Name': '示例：VR180 双目立体图',
  'sample.360Title': '360° 全景测试图',
  'sample.360Sub': '拖拽鼠标或 WASD 环顾四周',
  'sample.360Left': '← 左 (90°)',
  'sample.360Right': '右 (90°) →',
  'sample.360Back': '后方 (180°)',
  'sample.360Name': '示例：360° 全景图',
} as const;

export type TranslationKey = keyof typeof zh;

const en: Record<TranslationKey, string> = {
  'app.title': 'VRViewer — 2D / VR180 / 360° Immersive Media Player',
  'drop.title': 'Drop files to add to playlist',
  'drop.sub': 'Supports 2D / VR180 / 360° photos and videos (multiple allowed)',

  'welcome.badge': 'WebXR · Three.js · Client-Side',
  'welcome.title': 'VRViewer Immersive Media Browser',
  'welcome.desc':
    'Supports <strong>2D photos/videos</strong>, <strong>VR180 stereo</strong>, and <strong>360° panoramas</strong>. View smoothly in flat/mono mode on desktop browsers, or enter stereoscopic VR in one click on Meta Quest and other WebXR headsets.',
  'welcome.localBtn': 'Choose Local Files',
  'welcome.gdriveBtn': 'Mount Google Drive',
  'welcome.urlBtn': 'Open from URL',
  'welcome.sampleBtn': 'Load Built-in Samples',
  'welcome.tipDrag': '🖱️ Drag to look around / pan',
  'welcome.tipZoom': '🔍 Scroll to zoom FOV',
  'welcome.tipKeys': '⌨️ WASD / Arrows to move · R to reset',
  'welcome.tipDrop': '📦 Drag & drop files anywhere',

  'hud.noMedia': 'No media loaded',
  'hud.addLocal': '+ Local Files',
  'hud.addLocalTitle': 'Add local photos or videos',
  'hud.addGDrive': '+ Google Drive',
  'hud.addGDriveTitle': 'Mount and browse Google Drive files',
  'hud.addUrl': '+ URL',
  'hud.addUrlTitle': 'Enter an image or video URL',
  'hud.enterVR': 'Enter VR',
  'hud.exitVR': 'Exit VR',
  'hud.enterVRTitle': 'Enter WebXR VR mode in a supported headset browser',
  'hud.enterVRUnsupportedTitle':
    'No WebXR headset detected in this browser (open in Meta Quest Browser to enter VR)',
  'hud.playlistTitle': 'Playlist',
  'hud.toggleHudTitle': 'Hide/Show UI (H)',
  'hud.restoreHud': 'Show Controls (H)',
  'hud.restoreHudTitle': 'Show Controls (H)',
  'hud.langBtn': '中文',
  'hud.langTitle': '切换到中文',
  'hud.themeToLightTitle': 'Switch to Light Mode',
  'hud.themeToDarkTitle': 'Switch to Dark Mode',

  'video.playPauseTitle': 'Play/Pause (Space)',
  'video.seekLabel': 'Video progress',
  'video.muteTitle': 'Mute/Unmute (M)',
  'video.volumeLabel': 'Volume',

  'controls.projection': 'Projection',
  'controls.swapEyes': 'Swap Eyes',
  'controls.swapEyesTitle': 'Check this if left and right eyes appear swapped in stereo mode',
  'controls.resetView': 'Reset View (R)',
  'controls.resetViewTitle': 'Reset view and zoom (R)',
  'controls.fullscreen': 'Fullscreen (F)',
  'controls.fullscreenTitle': 'Toggle fullscreen (F)',
  'controls.helpTitle': 'Shortcuts & Help (?)',

  'playlist.heading': 'Playlist',
  'playlist.samples': 'Samples',
  'playlist.empty': 'Playlist is empty. Add local files or a URL above.',
  'playlist.removeTitle': 'Remove from playlist',
  'playlist.localTag': 'Local',

  'media.video': 'Video',
  'media.image': 'Photo',

  'urlModal.title': 'Add Online Media URL',
  'urlModal.urlLabel': 'Media URL (direct image or video link)',
  'urlModal.urlPlaceholder': 'https://example.com/photo_vr180.jpg or video.mp4',
  'urlModal.kindLabel': 'Media Type',
  'urlModal.kindAuto': 'Auto Detect',
  'urlModal.kindImage': 'Photo (Image)',
  'urlModal.kindVideo': 'Video',
  'urlModal.formatLabel': 'Projection Format',
  'urlModal.formatAuto': 'Auto Detect',
  'urlModal.corsNote':
    'Note: When rendering remote image/video textures in WebGL, the target server must send the <code>Access-Control-Allow-Origin: *</code> (CORS) header.',
  'urlModal.cancel': 'Cancel',
  'urlModal.submit': 'Open Media',

  'helpModal.title': 'Controls & Format Guide',
  'helpModal.basicTitle': 'Desktop 2D Browser Controls',
  'helpModal.basicList': `
    <li><strong>Left-click drag</strong>: Rotate view in 360° / VR180 mode; pan in 2D mode</li>
    <li><strong>Mouse wheel / + - keys</strong>: Zoom field of view (FOV)</li>
    <li><strong>W A S D / Arrow keys</strong>: Smoothly look around or pan</li>
    <li><strong>Spacebar</strong>: Play / Pause video</li>
    <li><strong>← / → (when video focused) or J / L</strong>: Seek backward / forward 5s</li>
    <li><strong>R key</strong>: Reset view and zoom</li>
    <li><strong>F key</strong>: Toggle fullscreen · <strong>H key</strong>: Hide/Show HUD</li>
  `,
  'helpModal.vrTitle': 'Stereoscopic & Quest VR Mode',
  'helpModal.vrList': `
    <li>When watching <strong>VR180 SBS / TB</strong> or <strong>360° Stereo</strong> on a 2D screen, the <strong>left-eye mono view</strong> is extracted automatically without split-screen artifacts.</li>
    <li>Click <strong>Enter VR</strong> in Meta Quest Browser or another <strong>WebXR</strong> browser to enable true stereo rendering (3DoF/6DoF head tracking, trigger to play/pause video).</li>
  `,

  'gdriveModal.title': 'Google Drive & Local Mounts',
  'gdriveModal.tabCloud': '☁️ Google Drive Cloud (OAuth)',
  'gdriveModal.tabMounts': '💾 Local Mounts (Drive Desktop / rclone)',
  'gdriveModal.oauthTitle': 'Option 1: Google OAuth 2.0 (Recommended, auto-refresh)',
  'gdriveModal.oauthHint':
    'Create an OAuth 2.0 Client (Web application) in Google Cloud Console and add the redirect URI below to "Authorized redirect URIs":',
  'gdriveModal.copy': 'Copy',
  'gdriveModal.clientId': 'Client ID',
  'gdriveModal.clientSecret': 'Client Secret',
  'gdriveModal.saveConnect': 'Save & Connect Google Drive',
  'gdriveModal.tokenTitle': 'Option 2: Quick Connect with Access Token',
  'gdriveModal.tokenHint':
    'If you already have an OAuth Access Token (e.g. from OAuth Playground), paste it below:',
  'gdriveModal.accessToken': 'Access Token',
  'gdriveModal.connectNow': 'Connect Now',
  'gdriveModal.connectedDefault': 'Google Drive Connected',
  'gdriveModal.disconnect': 'Disconnect',
  'gdriveModal.viewMyDrive': 'My Drive',
  'gdriveModal.viewShared': 'Shared with me',
  'gdriveModal.viewAllMedia': 'All Media',
  'gdriveModal.searchPlaceholder': 'Search files…',
  'gdriveModal.addAll': '+ Add All to Playlist',
  'gdriveModal.mountPlaceholder':
    'Enter mount path, e.g. ~/Library/CloudStorage/GoogleDrive-.../My Drive or /Volumes/GoogleDrive',
  'gdriveModal.mountAdd': 'Mount Directory',
  'gdriveModal.mountedDirs': 'Mounted Directories',

  'drive.copiedRedirect': 'Redirect URI copied',
  'drive.copyFailed': 'Copy failed, please copy manually',
  'drive.noMediaInDir': 'No playable photos or videos in this folder',
  'drive.addedCloudMedia': 'Added {count} Google Drive media item(s) to playlist',
  'drive.addedMountMedia': 'Added {count} mounted media item(s) to playlist',
  'drive.connected': 'Google Drive connected',
  'drive.oauthIncomplete': 'Google Drive authorization was not completed',
  'drive.backendError': 'Cannot connect to Bun backend: {msg}',
  'drive.backendFallback': 'Please start with bun run dev',
  'drive.enterCreds': 'Please enter both Client ID and Client Secret',
  'drive.authStartFailed': 'Failed to start authorization',
  'drive.enterToken': 'Please enter an Access Token',
  'drive.connectFailed': 'Connection failed',
  'drive.disconnected': 'Disconnected from Google Drive',
  'drive.disconnectFailed': 'Failed to disconnect',
  'drive.loadingCloud': 'Loading Google Drive files…',
  'drive.loadFailed': 'Failed to load',
  'drive.emptyDir': 'No photos, videos, or subfolders in this directory',
  'drive.folder': 'Folder',
  'drive.addQueue': '+ Queue',
  'drive.addQueueTitle': 'Add to playlist',
  'drive.addedSingle': 'Added to playlist: {name}',
  'drive.loadMore': 'Load more files…',
  'drive.mountEmptyHint':
    'Enter a path above, or click a detected Google Drive directory to mount it',
  'drive.mountReadFailed': 'Failed to read mounted directories',
  'drive.detectedLabel': 'Detected local Google Drive:',
  'drive.mountBtnPrefix': '+ Mount {name}',
  'drive.mountedToast': 'Mounted: {name}',
  'drive.mountFailed': 'Mount failed',
  'drive.enterPath': 'Please enter a directory path',
  'drive.mountedDirToast': 'Mounted directory: {name}',
  'drive.noMounts': 'No mounted directories',
  'drive.unmountTitle': 'Unmount',
  'drive.loadingDir': 'Loading directory…',
  'drive.readDirFailed': 'Failed to read directory',
  'drive.mountSourceLabel': 'Mounted Dir',

  'toast.noSupportedFiles': 'No supported photo or video files detected',
  'toast.invalidUrl': 'Please enter a valid http:// or https:// URL',
  'toast.noWebXR':
    'No WebXR device detected in this browser. Open in Meta Quest Browser or Chrome/Edge with a PCVR headset to enter VR mode.',
  'toast.vrEnterFailed': 'Failed to enter VR mode: {msg}',
  'toast.unknownError': 'Unknown error',

  'engine.imageLoadError':
    'Failed to load image: verify the URL is valid and the server allows CORS.',
  'engine.videoLoadError':
    'Failed to load video: check the format (MP4/WebM H.264/HEVC recommended) or server CORS headers.',
  'engine.webxrUnsupported': 'WebXR is not supported in this browser.',
  'api.requestFailed': 'Request failed ({status})',

  'format.2d.label': '2D Flat',
  'format.2d.short': '2D',
  'format.2d.desc': 'Standard flat photo or video',
  'format.vr180-sbs.label': 'VR180 Side-by-Side (SBS)',
  'format.vr180-sbs.short': 'VR180 SBS',
  'format.vr180-sbs.desc': '180° hemisphere stereo (left/right halves)',
  'format.vr180-tb.label': 'VR180 Top-Bottom (TB)',
  'format.vr180-tb.short': 'VR180 TB',
  'format.vr180-tb.desc': '180° hemisphere stereo (top/bottom halves)',
  'format.vr180-mono.label': 'VR180 Mono',
  'format.vr180-mono.short': 'VR180 Mono',
  'format.vr180-mono.desc': '180° hemisphere monoscopic view',
  'format.360-mono.label': '360° Panorama Mono',
  'format.360-mono.short': '360°',
  'format.360-mono.desc': '360° equirectangular panorama (2:1)',
  'format.360-tb.label': '360° Top-Bottom (TB)',
  'format.360-tb.short': '360° TB',
  'format.360-tb.desc': '360° stereo panorama (top/bottom 1:1)',
  'format.360-sbs.label': '360° Side-by-Side (SBS)',
  'format.360-sbs.short': '360° SBS',
  'format.360-sbs.desc': '360° stereo panorama (side-by-side 4:1)',
  'format.2d-sbs.label': '3D Theater Side-by-Side (SBS)',
  'format.2d-sbs.short': '3D SBS',
  'format.2d-sbs.desc': 'Flat 3D movie/photo (left/right halves)',
  'format.2d-tb.label': '3D Theater Top-Bottom (TB)',
  'format.2d-tb.short': '3D TB',
  'format.2d-tb.desc': 'Flat 3D movie/photo (top/bottom halves)',

  'sample.vr180Title': 'VR180 Stereo Test',
  'sample.vr180Left': 'Left Eye View',
  'sample.vr180Right': 'Right Eye View',
  'sample.vr180Name': 'Sample: VR180 Stereo Image',
  'sample.360Title': '360° Panorama Test',
  'sample.360Sub': 'Drag mouse or use WASD to look around',
  'sample.360Left': '← Left (90°)',
  'sample.360Right': 'Right (90°) →',
  'sample.360Back': 'Back (180°)',
  'sample.360Name': 'Sample: 360° Panorama',
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { zh, en };

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  const navLang = (navigator.language || '').toLowerCase();
  return navLang.startsWith('zh') ? 'zh' : 'en';
}

let currentLocale: Locale = detectInitialLocale();
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? zh;
  let text = dict[key] ?? zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

export function applyI18nToDom(): void {
  document.documentElement.lang = currentLocale === 'zh' ? 'zh-CN' : 'en';
  document.title = t('app.title');

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as TranslationKey | undefined;
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml as TranslationKey | undefined;
    if (key) el.innerHTML = t(key);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle as TranslationKey | undefined;
    if (key) el.title = t(key);
  });

  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder as TranslationKey | undefined;
    if (key) el.placeholder = t(key);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel as TranslationKey | undefined;
    if (key) el.setAttribute('aria-label', t(key));
  });
}

export function setLocale(locale: Locale): void {
  if (currentLocale === locale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage access errors
  }
  applyI18nToDom();
  listeners.forEach((cb) => cb(locale));
}

export function toggleLocale(): Locale {
  const next: Locale = currentLocale === 'zh' ? 'en' : 'zh';
  setLocale(next);
  return next;
}

export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
