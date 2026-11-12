# VRViewer 技术架构与设计文档

## 1. 框架选型：为什么选择 Three.js（对比 A-Frame）

在 Web 端实现 2D / VR180 / 360° 与 WebXR 播放，常见方案有 **A-Frame** 和 **Three.js**：

| 对比维度 | A-Frame | Three.js（本项目采用） |
| --- | --- | --- |
| 本质与抽象层 | 基于 Three.js 的声明式 HTML/ECS 框架 | 底层 WebGL / WebXR 3D 引擎 |
| VR180 / 双目立体控制 | 原生 `<a-sky>` 仅支持 360 单目；VR180/SBS/TB 需引入第三方组件（部分社区组件维护停滞，或与新版 Vite ESM 打包存在兼容问题） | 直接操作 `SphereGeometry` 的 `phiStart`/`phiLength` 与 `BufferAttribute` UV 坐标，精确控制半幅裁剪与立体层级 |
| 2D 模式与 VR 模式切换 | 实体-组件状态与自定义 2D 平移/缩放相机逻辑容易冲突 | 可自由切换「球面环顾相机」与「2D 平面平移缩放相机」，并通过 `camera.layers` 无缝衔接 WebXR |
| 构建与体积 | 依赖全局注册机制，Tree-shaking 较弱 | 原生 TypeScript 类型支持完善，与 Vite 打包体验极佳 |

因此，本项目直接使用 **Three.js + TypeScript + Vite** 构建核心渲染引擎 [`VRViewerEngine`](../src/viewer/VRViewerEngine.ts)，在保持极简依赖的同时获得对 UV 映射和 WebXR 立体渲染的完全掌控。

---

## 2. 投影几何与 UV 映射原理

核心渲染逻辑位于 [`VRViewerEngine.rebuildGeometry()`](../src/viewer/VRViewerEngine.ts)。

### 2.1 球面与半球方位角约定

Three.js `SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)` 生成外表面球体。为从球心内部观看且保证左右方向不镜像，我们对几何体执行：

```ts
geometry.scale(-1, 1, 1);
```

相机默认朝向 `-Z` 轴，因此将图像水平中心（`u = 0.5`）对齐 `-Z`：

- **360° 全景**：`phiStart = Math.PI / 2`，`phiLength = 2 * Math.PI`
- **VR180 半球**：`phiStart = Math.PI`，`phiLength = Math.PI`（覆盖前方 `-X` 到 `+X` 的 180° 水平视野与完整 180° 垂直视野）

### 2.2 双目分屏 UV 重映射

对于同一张纹理（`THREE.Texture` 或 `THREE.VideoTexture`），通过修改几何体顶点的 `uv` 属性将不同区域分配给左眼和右眼网格：

| 格式 | 左眼网格 UV 区域 | 右眼网格 UV 区域 |
| --- | --- | --- |
| `vr180-sbs` / `360-sbs` / `2d-sbs` | `u' = u * 0.5`（左半幅） | `u' = u * 0.5 + 0.5`（右半幅） |
| `vr180-tb` / `360-tb` / `2d-tb` | `v' = v * 0.5 + 0.5`（上半幅） | `v' = v * 0.5`（下半幅） |
| `2d` / `vr180-mono` / `360-mono` | 单网格 `u, v` 不变（`[0, 1]`） | 共用单网格 |

对于平面 3D（`2d-sbs`、`2d-tb`），计算虚拟银幕宽高比时会按单眼实际像素比例折半计算，避免画面被拉伸或压扁。

---

## 3. 2D 浏览器与 WebXR 立体渲染切换机制

本项目利用 Three.js 的 **Render Layers（渲染层）** 机制实现零重复纹理开销的双端渲染：

- **Layer 0**：单目内容（`2d`、`vr180-mono`、`360-mono`）
- **Layer 1**：左眼网格（默认）
- **Layer 2**：右眼网格（默认）

### 普通 2D 浏览器模式

主相机初始化时启用 Layer `0` 和 Layer `1`，关闭 Layer `2`：

```ts
this.camera.layers.enable(0);
this.camera.layers.enable(1);
this.camera.layers.disable(2);
```

因此用户在电脑或手机普通浏览器中打开双目立体照片/视频时，只会看到左眼画面，呈现出自然的单目全景或平面视角。

### WebXR VR 模式

当用户在支持 WebXR 的头显浏览器（如 Meta Quest Browser）点击「进入 VR 模式」后：

1. 请求 `immersive-vr` 会话并设置 `referenceSpaceType = 'local'`，使头部位于球心 `(0, 0, 0)`。
2. Three.js `WebXRManager` 会自动为左右眼相机分配掩码：
   - 左眼相机 `cameraL` 启用 Layer `0` 与 `1`，屏蔽 Layer `2`
   - 右眼相机 `cameraR` 启用 Layer `0` 与 `2`，屏蔽 Layer `1`
3. 从而在头显中实现真正的左右眼视差立体效果；若遇到左右眼反置的视频源，可通过 UI 中的「交换左右眼」即时对调 Layer 1/2。

---

## 4. 格式自动识别策略

自动识别逻辑位于 [`src/utils/formatDetect.ts`](../src/utils/formatDetect.ts)，按以下优先级推断：

1. **文件名关键词**：匹配 `vr180`、`180`、`360`、`equirect`、`sbs`、`lr`、`tb`、`ou` 等常见命名规范。
2. **本地文件 XMP 元数据扫描**：读取本地文件前 128 KB 文本，检查是否包含 `GPano:ProjectionType="equirectangular"`、`GPano:CroppedAreaImageWidthPixels`、`vr180`、`st3d`/`sv3d` 等标签。
3. **像素宽高比兜底**：媒体加载完成获得真实 `naturalWidth / naturalHeight`（或 `videoWidth / videoHeight`）后，对 `4:1`（`360-sbs`）、`2:1`（`360-mono`）、`1:1` 高分辨率（`360-tb`）进行二次修正；其余归为 `2d`。
