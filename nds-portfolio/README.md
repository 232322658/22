# Portfolio Lite · 粉色掌机作品集

一个 1:1 拟物的粉色双屏掌机风格作品集网站，带管理后台。

> 非官方致敬作品。外观是原创 SVG 绘制，与任何游戏机厂商无关，也不包含其商标。

- **前台**：开机画面 → 主菜单 → 卡带式作品墙 → 合盖动画 → 作品详情；另有关于我、经历、联系三页。支持鼠标、触摸和键盘操作；手机竖屏下自动切换为上下双屏布局。
- **后台** `/admin`：
  - 作品的增删改、排序、发布与下架；
  - 封面和多图上传（浏览器端自动压缩为 WebP）；
  - 个人资料、链接与经历的编辑；
  - 修改密码。
- **技术**：零构建原生 JS + Node `http` + SQLite（better-sqlite3），只有一个依赖。首屏约 55 KB，不含作品图。

## 快速开始

### 方式一：Node（需要 18 及以上版本）

```bash
npm install      # 会自动安装 server/ 依赖
npm start        # http://localhost:3000   后台：/admin
```

### 方式二：Docker

```bash
cp .env.example .env     # 可选：预设管理员密码等
docker compose up -d --build
```

数据（数据库和上传的图片）都保存在 `./data/` 目录下，备份时复制这个目录即可。

## 管理员初始化

首次启动时会自动创建管理员账号：

| 情况 | 结果 |
|---|---|
| 设置了 `ADMIN_PASSWORD` | 用该密码创建账号，用户名取 `ADMIN_USER`，默认为 `admin` |
| 没有设置 | 随机生成密码，打印在控制台，同时写入 `data/INITIAL_ADMIN_PASSWORD.txt` |

登录后请到「账号」页面修改密码，然后删除 `INITIAL_ADMIN_PASSWORD.txt`。

**忘记密码**：停止服务，然后运行下面的命令：

```bash
node -e "const D=require('./server/node_modules/better-sqlite3');new D('data/portfolio.db').prepare('DELETE FROM users').run()"
```

再次启动时会按上表重新创建管理员。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | 3000 | 监听端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `DATA_DIR` | ./data | 数据库与上传目录 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | admin / 随机 | 仅首次启动时生效 |
| `JWT_SECRET` | 自动生成，保存在 data/.jwt_secret | 登录令牌的签名密钥；更换后所有登录都会失效 |

## 键盘操作

| 键盘 | 掌机按键 | 作用 |
|---|---|---|
| 方向键 | 十字键 | 移动选择 |
| X 或 Enter | A | 确定 |
| Z、Esc 或 Backspace | B | 返回 |
| Q / W | L / R | 作品集翻页 |
| Enter（在子页面中） | START | 回主菜单 |
| Shift | SELECT | 开关声音 |
| S / A | X / Y | 预留 |

点击机身右上角的 **POWER** 可以关闭或打开屏幕。

## 目录结构

```
server/index.js   HTTP 服务 + API + 静态文件
server/seed.js    首次启动写入的示例资料与 3 个示例作品
web/              前台（index.html / style.css / app.js）
admin/            后台（index.html / admin.css / admin.js）
data/             运行时数据（已加入 .gitignore）
```

## API 摘要

**公开接口**

- `GET /api/profile`
- `GET /api/works`
- `GET /api/works/:id`
- `POST /api/auth/login`，每个 IP 10 分钟内最多 8 次

**需要 `Authorization: Bearer <token>` 的接口**

- `GET /api/admin/works`
- `POST /api/admin/works`
- `PUT /api/admin/works/:id`
- `PATCH /api/admin/works/:id`
- `DELETE /api/admin/works/:id`
- `PUT /api/admin/works-order`
- `PUT /api/admin/profile`
- `POST /api/admin/upload`，图片以 dataURL 上传，支持 webp/png/jpeg/gif，不超过 8 MB
- `POST /api/admin/password`

## 部署建议

- 公网部署时请在前面加一层 HTTPS 反向代理（如 Caddy 或 Nginx），并把上传大小限制设为 12 MB 以上。
- v1 暂不包含：留言板、多账号、多语言、SEO 优化、对象存储。
