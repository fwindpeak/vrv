# VRViewer — 纯前端 2D / VR180 / 360° 沉浸式媒体播放器

基于 **Vite + TypeScript + Three.js + WebXR** 构建的纯前端照片与视频播放器，无需后端服务器即可在浏览器中观看本地或在线 URL 的 2D、VR180 立体与 360° 全景内容。

## 功能特性

- **多格式支持**
  - **2D 平面**：普通照片 / 视频（`2d`），以及平面 3D 左右/上下分屏（`2d-sbs`、`2d-tb`）
  - **VR180**：180° 半球左右双目（`vr180-sbs`）、上下双目（`vr180-tb`）、单目（`vr180-mono`）照片与视频
  - **360° 全景**：360° 等距柱状单目（`360-mono`）、上下双目（`360-tb`）、左右双目（`360-sbs`）照片与视频
- **灵活的媒体来源**
  - **本地文件**：点击选择或直接拖拽多个照片/视频文件到浏览器窗口，自动生成本地播放列表（`URL.createObjectURL`，数据不上传服务器）
  - **在线 URL**：输入图片或视频直链即可播放
  - **内置测试图**：支持一键生成离线 VR180 双目与 360° 全景测试图，方便快速验证效果
- **双端自适应体验**
  - **普通 2D 浏览器**：支持鼠标拖拽、滚轮缩放、WASD / 方向键浏览；观看 VR180 / 3D 双目内容时，默认只渲染左眼单目视角，呈现正常平面/全景画面而不会出现重影分屏
  - **Quest / WebXR 浏览器**：支持检测 `immersive-vr` 能力，提供「进入 VR 模式」按钮，在头显中自动开启左右眼独立立体渲染与头部追踪，并支持手柄扳机键控制视频播放/暂停
- **自动格式识别与手动切换**
  - 根据文件名关键词（如 `vr180`、`360`、`sbs`、`tb`）、本地文件 XMP 元数据（`GPano`）及宽高比自动推断投影格式，也可随时通过底部控制栏一键切换或交换左右眼

## 快速开始

### 环境要求

- **Bun 1.1+**（已验证 v1.4.2，推荐）或 Node.js 18+

### 安装与运行

```bash
# 安装依赖
bun install

# 启动开发服务器（同时启动 Bun API 服务与 Vite 前端热更新）
bun run dev

# 类型检查与生产构建
bun run build

# 启动生产服务（Bun 直接托管静态资源与 Google Drive 代理 API）
bun run start
```

### 挂载与观看 Google Drive

点击页面顶部「**+ Google Drive**」或欢迎页「**挂载 Google Drive**」，支持两种方式：

1. **Google Drive 云端挂载（OAuth 2.0）**：
   - 在弹窗中填写 Google Cloud OAuth Client ID / Client Secret（也可通过环境变量 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 配置），完成授权后即可在网页内浏览「我的云端硬盘」「与我共享」「全部媒体」并直接播放。
   - 也支持直接粘贴 OAuth Access Token 快速连接。
   - 所有照片与视频均通过 Bun 后端流式代理（支持 HTTP `Range` 拖拽进度与同源 CORS），可直接用于 Three.js / WebGL / WebXR 立体渲染。
2. **本地挂载目录（Google Drive for Desktop / rclone）**：
   - 自动检测 macOS 本机 Google Drive for Desktop 挂载目录（`~/Library/CloudStorage/GoogleDrive-*`），支持一键挂载，也可手动添加任意本地或 `rclone` 挂载路径。

## 操作快捷键

| 按键 / 操作 | 说明 |
| --- | --- |
| 鼠标左键拖拽 | 180° / 360° 模式下环顾视角；2D 模式下平移画面 |
| 鼠标滚轮 / `+` `-` | 缩放视场角 (FOV) |
| `W` `A` `S` `D` / 方向键 | 平滑旋转视角或平移画面 |
| `空格` | 播放 / 暂停视频 |
| `J` / `L` | 视频快退 / 快进 5 秒 |
| `M` | 静音 / 取消静音 |
| `R` | 重置视角与缩放 |
| `F` | 全屏切换 |
| `H` | 隐藏 / 显示控制栏 |
| `?` | 打开快捷键与帮助弹窗 |

## 在 Meta Quest 等 XR 设备上使用注意事项

1. **HTTPS 要求**：WebXR API（`navigator.xr`）在非 `localhost` 环境下要求站点通过 **HTTPS** 访问。局域网调试时可通过反向代理（如 Caddy / Nginx / mkcert）或部署到支持 HTTPS 的静态托管（GitHub Pages、Cloudflare Pages、Vercel）后，在 Quest Browser 中打开即可点击「进入 VR 模式」。
2. **远程 URL 的 CORS 限制**：纯前端 WebGL 渲染远程图片或视频纹理时，目标服务器必须返回 `Access-Control-Allow-Origin: *`（或允许当前站点域名）的 CORS 响应头，否则浏览器会阻止 WebGL 读取像素。本地文件不受此限制。

## 目录结构

```text
vrviewer/
├── index.html                   # 页面结构与 HUD / 弹窗 / 播放列表 DOM
├── package.json                 # 依赖与 npm 脚本
├── tsconfig.json                # TypeScript 编译配置
├── vite.config.ts               # Vite 配置
├── README.md                    # 项目说明文档
├── docs/
│   └── ARCHITECTURE.md          # 技术架构、框架选型与立体投影原理文档
└── src/
    ├── main.ts                  # UI 交互、播放列表、快捷键与事件绑定
    ├── style.css                # 深色沉浸式 UI 样式
    ├── types.ts                 # 媒体项与投影格式类型定义
    ├── vite-env.d.ts            # Vite 客户端类型声明
    ├── utils/
    │   ├── formatDetect.ts      # 文件类型、XMP 元数据与投影格式自动推断
    │   └── sampleMedia.ts       # 离线 Canvas 测试图生成器（VR180 SBS / 360°）
    └── viewer/
        └── VRViewerEngine.ts    # Three.js + WebXR 核心渲染与交互引擎
```
