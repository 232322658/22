# 余烬 · 崔健《寂寞就像一团烈火》

纯代码音乐短片 v1。先完成背景调研及导演分镜，再使用 Canvas 2D 实时绘制所有场景。
不使用 PNG/JPG 背景、不加载 GLB、不播放预渲染 MP4。音乐来自用户 main 文件。

## 直接使用

**[单文件 HTML 下载](https://github.com/232322658/22/raw/refs/heads/arena/e0eb6d0e-22/mv/lonely-fire/embers.html)**

下载 `embers.html` 后，用现代浏览器打开，点击“进入这团火”。音频、字体、CSS、JavaScript 都内嵌；不需要安装 npm、不需要网络或 CDN。约 6.5 MB。
GitHub 的源码页面不会执行 HTML，需要下载到本地或使用静态托管。

多文件版本：在仓库根目录 `npm install && npm run dev`，访问 `/mv/lonely-fire/`。
构建产物也在 `dist/mv/lonely-fire/`，支持子目录静态托管。

## 导演与背景资料

见 [DIRECTION.md](DIRECTION.md)：先行背景研究、资料来源、事实和评论的区别、艺术表达、完整 24 段分镜、歌词规则、验收计划。

美术为黑纸上的铜版／剪纸风格：落日、相对的两个人、弯曲影子、空椅酒杯、烈火与链节。
这是一支独立阐释的 MV，不是官方作品，也不是演唱者传记。

## 同步与自然剪辑

- 完整音频约 4:50；36 个歌词段，繁体歌词保持原文。
- 读取多重时间戳；`offset:500` 按标准正值提前规则扣除 0.5 秒。music 与编辑说明不当作歌词。
- 唯一主时钟是音频 `currentTime`。所有场景、粒子、人物动作、转场、字幕都从绝对时间计算。
- 24 个镜头通过 1.65 秒平滑叠化，使用太阳／杯口／火核等重复圆形构图匹配；无快速闪屏。
- 音乐能量数据预先从原 MP3 提取，只影响火焰及光感，不决定字幕时钟。
- 支持播放、暂停、拖动进度、4 个章节、静音、全屏、字幕额外偏移校准。空格播放／暂停，左右键跳转 5 秒。
- 歌词同步依据提供的 LRC，未声称有逐字 ASR 强制对齐；如果原 LRC 本身存在误差，可从页脚做小范围校准。

## 可编辑文件

| 文件 | 用途 |
|---|---|
| `scenes.js` | 24 段时间线，人物、城市、光、火、链节、静物等独立绘制脚本 |
| `player.js` | 音频主时钟、播放器交互、字幕、帧合成与叠化 |
| `timeline.js` | 解析后的歌词和音乐能量数组 |
| `prepare.py` | 从源 LRC、MP3 重新生成数据 |
| `index.html` / `style.css` | 页面与播放器设计 |
| `build.mjs` | 可读源码内联、音乐／字体内嵌的 HTML 构建，不压缩场景代码 |
| `assets/` | 原始音乐、LRC、字体与 SIL OFL 授权 |
| `embers.html` | 可离线打开的单文件交付物 |

修改镜头或样式后：`npm run build:mv`。所有源码与 HTML 直接提交到 GitHub，不用模型文件替代。

重新提取歌词／音频能量（Python 为制作工具，浏览器播放不需要 Python）：

```sh
python -m venv .venv
.venv/bin/pip install numpy imageio-ffmpeg
.venv/bin/python mv/lonely-fire/prepare.py
npm run build:mv
```

## 检验

```sh
npm run test:mv                 # npm run dev 服务运行时
MV_STANDALONE=1 npm run test:mv  # 验证离线 file:// HTML
```

浏览器检查完整音频、36 个字幕段、offset 边界、播放暂停、seek、静音、校准、任意时间帧确定性及手机布局。
测试会抽帧至忽略的 `.cache/lonely-fire/`，供导演视觉复核，不将大量截图放进 Git。

音频及歌词版权属于各自权利人，本项目不宣称拥有音乐版权。字体许可证见 `assets/OFL.txt`。

本会话的迭代分支为 `arena/e0eb6d0e-22`，没有修改或合并 main。
