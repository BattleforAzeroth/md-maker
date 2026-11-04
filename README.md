# MD Maker

一个轻量 Markdown 浏览器编辑器，支持 Supabase 云端登录与文档同步；未配置 Supabase 时仍可用浏览器本地存储模式。

## 配置 Supabase 云端同步

1. 在 Supabase 创建免费项目。
2. 在 **SQL Editor** 执行以下建表和权限脚本：

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '未命名文档.md',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy "Users can view their own documents"
on documents for select using (auth.uid() = user_id);

create policy "Users can create their own documents"
on documents for insert with check (auth.uid() = user_id);

create policy "Users can update their own documents"
on documents for update using (auth.uid() = user_id);

create policy "Users can delete their own documents"
on documents for delete using (auth.uid() = user_id);
```

3. 在 **Authentication → Users** 创建两个邮箱账号和密码。
4. 将 `config.example.js` 复制为 `config.js`，填入 **Project URL** 和 **anon public key**。`service_role key` 不能放进网页。
5. 重新部署静态文件。配置完成后登录使用邮箱和 Supabase 密码，文档会同步到云端。

如果不配置 Supabase，页面会使用浏览器本地模式；这种模式不能跨浏览器同步，也不适合保护隐私。

## 本地运行

在 `md-maker` 目录启动任意静态服务器，例如：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 免费部署（中国可访问）

推荐使用 GitHub Pages：将 `md-maker` 目录内容放入 GitHub 仓库根目录，进入仓库 **Settings → Pages**，选择 **Deploy from a branch**、`main` 分支和 `/ (root)`，保存后等待生成站点。

如果 GitHub Pages 在你的网络环境访问不稳定，也可以使用 Cloudflare Pages 的免费静态托管，连接同一个 GitHub 仓库，不需要构建命令，输出目录填 `/`。
