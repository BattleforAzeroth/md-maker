# MD Maker

一个无需后端的轻量 Markdown 浏览器编辑器，支持两个固定密码、独立工作区、多文件、自动保存、手动保存和 `.md` 下载。

这是前端演示版，密码配置在 `app.js` 中，不能抵御查看网页源代码的用户；正式使用应接入后端鉴权和数据库。

## 本地运行

在 `md-maker` 目录启动任意静态服务器，例如：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 免费部署（中国可访问）

推荐使用 GitHub Pages：将 `md-maker` 目录内容放入 GitHub 仓库根目录，进入仓库 **Settings → Pages**，选择 **Deploy from a branch**、`main` 分支和 `/ (root)`，保存后等待生成站点。

如果 GitHub Pages 在你的网络环境访问不稳定，也可以使用 Cloudflare Pages 的免费静态托管，连接同一个 GitHub 仓库，不需要构建命令，输出目录填 `/`。
