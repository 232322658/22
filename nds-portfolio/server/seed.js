// Demo content written on first run. Everything here can be edited / deleted in /admin.
'use strict';
const fs = require('fs');
const path = require('path');

function cover(name, c1, c2, shapes) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/>${shapes}</svg>`;
}
const covers = {
  'demo-1.svg': cover('a', '#ffd6e3', '#ff8fb1', '<circle cx="470" cy="150" r="90" fill="#fff" opacity=".85"/><rect x="80" y="250" width="300" height="150" rx="18" fill="#fff" opacity=".9"/><rect x="110" y="285" width="180" height="16" rx="8" fill="#ff8fb1"/><rect x="110" y="320" width="230" height="12" rx="6" fill="#ffc2d4"/><rect x="110" y="345" width="200" height="12" rx="6" fill="#ffc2d4"/>'),
  'demo-2.svg': cover('b', '#fff0f5', '#c9b6ff', '<g fill="none" stroke="#fff" stroke-width="14" opacity=".9"><circle cx="320" cy="240" r="130"/><circle cx="320" cy="240" r="70"/></g><circle cx="320" cy="240" r="26" fill="#ff7aa2"/><g fill="#fff"><circle cx="120" cy="90" r="10"/><circle cx="540" cy="390" r="14"/><circle cx="560" cy="80" r="6"/></g>'),
  'demo-3.svg': cover('c', '#ffe5ec', '#ffb38a', '<path d="M0 360 Q160 280 320 340 T640 320 V480 H0Z" fill="#fff" opacity=".7"/><path d="M0 400 Q200 340 360 390 T640 380 V480 H0Z" fill="#ff8fb1" opacity=".6"/><g fill="#fff"><rect x="250" y="120" width="140" height="140" rx="30" opacity=".95"/></g><path d="M300 170 h40 v40 h-40z" fill="#ffb38a"/>'),
};

module.exports = function seed(db, uploadDir) {
  for (const [f, svg] of Object.entries(covers)) fs.writeFileSync(path.join(uploadDir, f), svg);
  const profile = {
    name: 'MOMO', title: '视觉设计师 · 前端开发', tagline: '把喜欢的东西，认真做成作品。',
    bio: '你好！这里是示例简介，请在后台「个人资料」里改成你自己的内容。\n\n我喜欢把界面做得有温度：一点点拟物、一点点像素、很多很多细节。擅长品牌视觉、交互原型与前端实现。\n\n这个站点本身就是一件作品——一台粉色的掌机。用十字键或鼠标探索吧。',
    avatar: '', email: 'hello@example.com', location: 'Taipei',
    skills: ['UI / UX', '品牌视觉', '插画', 'HTML / CSS / JS', 'Figma'],
    links: [{ label: 'Email', url: 'mailto:hello@example.com', icon: '✉' }, { label: 'GitHub', url: 'https://github.com/', icon: '◆' }, { label: 'Dribbble', url: 'https://dribbble.com/', icon: '●' }],
    experience: [
      { period: '2024 — 今', role: '高级视觉设计师', org: '示例工作室', desc: '负责品牌系统与产品界面设计，主导设计规范落地。' },
      { period: '2021 — 2024', role: '前端开发', org: '示例科技', desc: '构建组件库与营销页面，关注动效与可访问性。' },
      { period: '2017 — 2021', role: '视觉传达设计 学士', org: '示例大学', desc: '毕业设计获系内优秀作品。' },
    ],
  };
  db.prepare("INSERT INTO settings(key,value) VALUES('profile',?)").run(JSON.stringify(profile));
  const ins = db.prepare('INSERT INTO works(title,category,tags,year,cover,images,summary,description,link,sort,published) VALUES(?,?,?,?,?,?,?,?,?,?,1)');
  ins.run('示例作品 · 品牌视觉', '品牌', JSON.stringify(['Branding', 'Logo']), '2025', '/uploads/demo-1.svg', JSON.stringify(['/uploads/demo-1.svg', '/uploads/demo-3.svg']),
    '一个甜品店的品牌识别系统。', '这是一条示例作品，用来展示详情页的版式。\n\n在后台可以编辑标题、分类、标签、年份、封面、多张配图、简介与正文，也可以设置外部链接、调整排序或下架。\n\n正文支持多段落，空一行即可分段。', 'https://example.com', 0);
  ins.run('示例作品 · App 界面', 'UI', JSON.stringify(['App', 'Figma']), '2024', '/uploads/demo-2.svg', JSON.stringify(['/uploads/demo-2.svg']),
    '冥想类 App 的界面与动效。', '示例正文：从信息架构到高保真界面与动效规范。', '', 1);
  ins.run('示例作品 · 插画系列', '插画', JSON.stringify(['Illustration']), '2023', '/uploads/demo-3.svg', JSON.stringify(['/uploads/demo-3.svg']),
    '季节主题的插画练习。', '示例正文：一组以「季节」为主题的插画。', '', 2);
};
