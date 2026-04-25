# 🎉 大同市第二中学校庆网站

> 现代、精致、丝滑的校庆专题网站

## 📁 项目结构

```
datong-no2-anniversary/
├── package.json          # 项目依赖配置
├── server.js             # Express 后端服务器
├── .env                  # 环境变量（数据库连接信息）
├── .env.example          # 环境变量示例
└── public/               # 前端静态文件
    ├── index.html        # 首页（倒计时、校歌、祝福墙）
    ├── history.html      # 校史时间轴（请替换为你自己的文件）
    ├── logo.png          # 校徽图片（请放入你的校徽）
    ├── anthem.mp3        # 校歌音频（请放入你的校歌）
    ├── css/
    │   └── style.css     # 样式文件
    └── js/
        └── main.js       # 交互逻辑
```

## ✨ 功能特性

- ⏰ **校庆倒计时** — 实时动态倒计时，精确到秒
- 🎵 **校歌播放器** — 精美黑胶唱片UI，支持播放/暂停/进度拖动
- 💌 **祝福墙** — 发送祝福 + 实时显示所有祝福（数据存储在 Turso 数据库）
- 📜 **校史时间轴** — 独立页面入口（你已有 HTML，直接替换即可）
- ℹ️ **更多信息** — 底部"更多"按钮弹出模态框，显示版本、制作人等信息
- 🎨 **现代设计** — 毛玻璃效果、粒子背景、丝滑动画、响应式布局

## 🚀 部署步骤（手把手教程）

### 第一步：准备工作

1. 注册以下账号（全部免费）：
   - **GitHub**：[https://github.com](https://github)（用于代码托管）
   - **Turso**：[https://turso.tech](https://turso.tech)（用于数据库）
   - **Pxxl**：[https://pxxl.app](https://pxxl.app)（用于部署网站）

2. 在你的电脑上安装：
   - **Node.js**：[https://nodejs.org](https://nodejs.org)（下载 LTS 版本，一路下一步安装）
   - **Git**：[https://git-scm.com](https://git-scm.com)（一路下一步安装）

---

### 第二步：创建 Turso 数据库

1. 打开终端（Windows 按 `Win+R` 输入 `cmd` 回车；Mac 打开"终端"App）

2. 安装 Turso CLI：
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

3. 登录 Turso：
   ```bash
   turso auth login
   ```
   这会打开浏览器让你授权，点击确认即可。

4. 创建数据库：
   ```bash
   turso db create datong-no2-db
   ```

5. 获取数据库连接信息：
   ```bash
   # 获取数据库 URL
   turso db show datong-no2-db --url

   # 获取访问令牌
   turso db tokens create datong-no2-db
   ```
   **把这两个值记下来，后面要用！**

---

### 第三步：准备项目文件

1. 解压本项目压缩包，得到一个文件夹 `datong-no2-anniversary`

2. **放入校徽**：将你的 `logo.png` 放到 `public/` 文件夹下

3. **放入校歌**：将你的校歌音频文件命名为 `anthem.mp3`，放到 `public/` 文件夹下
   - 如果没有校歌文件，播放器会提示用户上传

4. **替换校史页面**：将你的 `history.html` 覆盖 `public/history.html`

5. **修改校庆日期**：打开 `public/js/main.js`，找到第一行：
   ```javascript
   const ANNIVERSARY_DATE = new Date('2026-10-01T00:00:00').getTime();
   ```
   把日期改成你的实际校庆日期。

6. **配置环境变量**：
   - 复制 `.env.example` 为 `.env`
   - 用记事本打开 `.env`，填入：
     ```
     TURSO_DATABASE_URL=libsql://你的数据库地址.turso.io
     TURSO_AUTH_TOKEN=你的令牌
     PORT=3000
     ```

---

### 第四步：本地测试（可选但推荐）

1. 在终端中进入项目文件夹：
   ```bash
   cd datong-no2-anniversary
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动服务器：
   ```bash
   npm start
   ```

4. 打开浏览器访问：`http://localhost:3000`
   - 测试倒计时、播放器、祝福墙是否正常工作

5. 按 `Ctrl+C` 停止服务器

---

### 第五步：部署到 Pxxl

1. **创建 GitHub 仓库**：
   - 打开 [https://github.com/new](https://github.com/new)
   - 仓库名填 `datong-no2-anniversary`
   - 选择 "Public"（公开）
   - 点击 "Create repository"

2. **上传代码**：
   在项目文件夹中打开终端，依次执行：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/datong-no2-anniversary.git
   git push -u origin main
   ```
   > 注意：第一次会提示你登录 GitHub，按提示操作即可。

3. **在 Pxxl 部署**：
   - 打开 [https://pxxl.app](https://pxxl.app) 并登录
   - 点击 "New Project" 或 "Deploy"
   - 选择 "Import from GitHub"
   - 选择你的 `datong-no2-anniversary` 仓库
   - 在环境变量（Environment Variables）中添加：
     - `TURSO_DATABASE_URL` = 你的数据库 URL
     - `TURSO_AUTH_TOKEN` = 你的令牌
   - 点击 "Deploy"

4. **完成！** 等待 1-2 分钟，Pxxl 会给你一个在线网址，打开即可访问！

---

### 第六步：自定义"更多信息"

打开 `public/index.html`，找到模态框部分（搜索 "关于本站"），修改以下内容：
- 网站版本
- 制作人（改成你的名字）
- 制作时间
- 其他你想展示的信息

改完后重新提交到 GitHub，Pxxl 会自动重新部署。

---

## 🔧 常见问题

**Q: 祝福发送失败？**  
A: 检查 `.env` 中的数据库 URL 和令牌是否正确，以及 Turso 数据库是否正常运行。

**Q: 校歌无法播放？**  
A: 确保 `public/anthem.mp3` 文件存在，且格式为 MP3。

**Q: 校徽不显示？**  
A: 确保 `public/logo.png` 存在，建议尺寸为正方形（如 512x512）。

**Q: 如何更新网站？**  
A: 修改文件后，执行：
```bash
git add .
git commit -m "更新内容"
git push
```
Pxxl 会自动重新部署。

---

## 📄 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **后端**：Node.js + Express
- **数据库**：Turso (SQLite)
- **部署**：Pxxl App

---

🎊 **祝大同二中校庆圆满成功！**
