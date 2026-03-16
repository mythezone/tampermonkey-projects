# Tampermonkey Projects

这个仓库用于存放独立维护的篡改猴脚本。每个脚本都放在单独子目录中，目录内至少包含：

- `*.user.js`：可直接安装的脚本文件
- `README.md`：脚本说明、配置项、安装与使用方式
- `docs/`：项目结构和实现约定，供后续 LLM/Agent 快速读取
- `templates/`：可复用模板和代码片段，帮助保持风格与实现一致

目录约定：

- `scripts/<script-name>/`
- 每个脚本优先提供自己的配置界面，并将配置持久化到 Tampermonkey 存储
- 推荐保留统一的快捷键呼出方式，例如 `Alt+C`

推荐阅读顺序：

1. [`docs/project-structure.md`](/Volumes/local/Project/github/tampermonkey-projects/docs/project-structure.md)
2. [`docs/script-conventions.md`](/Volumes/local/Project/github/tampermonkey-projects/docs/script-conventions.md)
3. [`templates/README.md`](/Volumes/local/Project/github/tampermonkey-projects/templates/README.md)

脚本总表：

| Name | Directory | Description | Status |
| --- | --- | --- | --- |
| Send Current URL to Webhook | `scripts/send-current-url-to-webhook/` | 在页面右上角显示一个滑出按钮，点击后把当前页面 URL 通过 POST 发送到 webhook。支持 `Alt+C` 配置界面、Basic Auth 和域名白名单。 | Ready |
