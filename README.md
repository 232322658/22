# 雨の角 — Komorebi Mart

一个没有界面控件、没有人物的雨夜便利店微缩景观。使用 Three.js 构建，所有模型、商品包装、海报和标识均在本地程序化生成；字体随项目提供，不依赖外部素材服务。

## 运行

```sh
npm install
npm run dev
```

开发服务默认监听 `0.0.0.0:5173`，已允许 Arena 的 `.e2b.app` 预览域名。

```sh
npm run build  # 生成 dist/
npm test       # 服务运行时执行浏览器冒烟测试
```

`dist/` 中的生成产物（HTML、打包 JS 与字体副本）会**直接提交到 GitHub**，不放入 `.gitignore`。以后每次重新制作或修改场景后，运行 `npm run build` 并将 `dist/` 一并提交，仓库里始终保存最新的可用静态版本，可直接下载或用于 GitHub Pages 等静态托管。

## 观看

- 鼠标左键拖动：旋转；滚轮：缩放；右键拖动：平移。
- 触屏单指拖动：旋转；双指捏合：缩放；双指移动：平移。
- 所有控制都直接作用于场景，不显示菜单、按钮或提示面板。

## 场景内容

- 单一正方形底座、L 形街道、停车位、斑马线、盲道、排水沟和栏杆。
- 双面玻璃店铺、实际建模的货架与商品、饮料冷柜、便当、饭团、收银台、咖啡机、关东煮、冰柜、杂志和后场门。
- 贩卖机、自行车、伞架、分类垃圾桶、公告栏、盆栽、空调外机、路灯、电线杆和电缆。
- Toon 分段明暗、几何轮廓线、暖冷灯光、克制的 Bloom 和带扰动的实时平面反射。
- 持续降雨、檐下滴水、积水涟漪、玻璃水痕、微弱灯光波动、18 秒周期自动门和交通信号灯变化。

静态几何按材质合并以减少绘制调用；动态部分独立更新。雨粒子限制在底座范围，屋顶与雨棚会阻止雨线落进店内。

## 测试

`npm test` 使用 Playwright 和通过 npm 安装的 Chromium，检查浏览器与着色器错误、拖动旋转、滚轮缩放、移动端尺寸和无 UI 控件。可使用 `TEST_URL` 指定服务地址。浏览器运行库和测试截图存放于忽略的 `.cache/`，不进入版本库。

字体：Zen Maru Gothic Medium，SIL Open Font License 1.1；许可证见 `public/fonts/OFL.txt`。

## 源码交付（不使用 GLB）

- **`convenience-store.html`**：单文件网页源码，内联未压缩的场景 JavaScript、CSS 和字体。下载后用现代浏览器打开；需要联网从 jsDelivr 加载固定版本的 Three.js。没有 GLB，也没有模型加载器。
- **`src/main.js`**：便于编辑的场景 JavaScript 原文件。
- **`index.html`、`vite.config.js`、`package.json`、`package-lock.json`**：完整开发入口和配置。
- **`dist/`**：构建后的静态网页，用 HTTP 服务托管；静态版本资源全部来自项目，不依赖 CDN。路径支持子目录部署。

源码入口：<https://github.com/232322658/22/blob/arena/e0eb6d0e-22/convenience-store.html>

后续修改按用户要求直接交付 HTML、JavaScript 和配置源码到 GitHub，**不要用 GLB 等模型格式代替源码**。运行 `npm run build` 会同步生成 `dist/` 和 `convenience-store.html`；单独更新源码 HTML 可运行 `npm run html`。

GitHub Pages 的分支发布只支持仓库根目录或 `/docs`，不能在设置中直接选择 `dist/`。如要部署 `dist/`，应配置 GitHub Actions 上传该目录；本项目当前未启用 Pages 部署。

## 音乐歌词视频

新增 [Eternity — AiRI · 夏日回忆](video/eternity/README.md)，使用 main 中提供的 MP3 与 LRC 制作完整日中双语歌词视频。成片、字幕、画面和可编辑制作源码位于 `video/eternity/`。
