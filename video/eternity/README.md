# Eternity — AiRI · 夏日回忆

一支完整日中双语歌词视频，使用仓库 main 中用户提供的 `AiRI - Eternity.mp3` 与 `Eternity - AiRI.lrc`。

## 下载

- [成片 MP4 直链](https://github.com/232322658/22/raw/refs/heads/arena/e0eb6d0e-22/video/eternity/Eternity-AiRI-1080p.mp4)
- [双语 SRT 字幕](https://github.com/232322658/22/raw/refs/heads/arena/e0eb6d0e-22/video/eternity/Eternity-AiRI-1080p.srt)
- `watch.html`：下载此目录后可用浏览器播放，MP4 与 HTML 置于同一目录。

## 规格与制作

- 1920 × 1080，16:9，24 fps；H.264 + AAC 192 kbps；MP4 fast-start。
- 完整歌曲，约 4 分 35 秒，没有替换歌声、没有截短或调整播放速度。
- 43 个日中双语字幕段，按 LRC 时间戳显示；间奏处隐藏上一句，歌词原文不修改。
- 原创 AI 生成夏日插画 5 张：海边小镇、列车窗景、向日葵小路、黄昏房间、日落海滩。
- 24 个镜头段，缓慢推拉与平移、柔和叠化、光点、细微音乐响应、片头与片尾。
- 这是“插画 + 镜头动效”的歌词 MV，不是角色逐帧动画或官方 MV。

原始音乐及歌词内容的权利属于其各自权利人；本项目不宣称拥有这些内容的版权。画面为原创生成，字体采用 SIL OFL 授权，许可证位于 `fonts/`。

## 可编辑制作源码

- `render.py`：字幕解析、镜头时间线、运动与合成、编码的完整源码。
- `art/`：5 张原始画面 JPG。
- `fonts/`：经过子集化的日文、中文字体与许可证。
- `lyrics.lrc`：与本次输入一致的歌词文件。
- `Eternity-AiRI-1080p.json`：成片参数与镜头时间线。
- `manifest.json`：来源提交与输入/输出 SHA-256。

重新制作：

```sh
python -m venv .venv
.venv/bin/pip install -r video/eternity/requirements.txt
# 从 main 下载原始 MP3 或使用本地同一文件
.venv/bin/python video/eternity/render.py \
  --audio 'AiRI - Eternity.mp3' \
  --lyrics video/eternity/lyrics.lrc \
  --output video/eternity/Eternity-AiRI-1080p.mp4
```

视频及源码直接保存到 GitHub。本次成片低于 GitHub 单文件 100 MB 限制，无需拆分压缩；下载 MP4 后即可播放。
