# Script Conventions

这个文档定义脚本实现层面的统一约定，供后续 LLM 或 Agent 直接遵循。

## Script File Requirements

- 使用标准 Tampermonkey 头部注释
- 默认 `@run-at document-idle`
- 只在确实需要时添加 `@grant`
- 如果脚本涉及跨域请求，优先使用 `GM_xmlhttpRequest`
- 如果脚本需要持久化配置，优先使用 `GM_getValue` 和 `GM_setValue`

## Configuration Rules

- 优先提供图形化配置界面，而不是要求用户改源码
- 配置应在脚本内部持久化，并在所有页面中共享
- 推荐统一使用 `Alt+C` 打开配置界面
- 域名白名单应作为显式配置项
- 对于敏感字段，如密码，输入框使用 `password` 类型
- 配置保存后应立即生效

## UI Rules

- 注入式 UI 尽量固定在页面边缘，避免遮挡正文
- 默认状态尽量低干扰
- 推荐提供一个始终可见但默认折叠的小入口
- 鼠标悬停或快捷键触发时再展开完整界面
- 如果有折叠 dock，优先提供 `pin` 能力用于保持展开
- 弹窗类 UI 统一使用 overlay + modal 结构
- 弹窗支持点击遮罩关闭
- 弹窗支持 `Escape` 关闭

## Domain Matching Rules

- 域名列表按行输入
- `example.com` 应匹配 `example.com` 及其子域名
- `*` 表示匹配全部域名
- 域名名单默认用于控制功能是否可执行
- 常驻入口不应因域名名单而消失
- 域名名单不应阻止打开配置界面

## Network Rules

- 请求方法、请求体字段名、认证方式都写在脚本 README 中
- 认证默认优先支持 Basic Auth
- 认证请求头在配置为空时不应发送
- 请求失败时需要给出最小可见反馈

## README Rules

每个脚本目录下的 `README.md` 建议包含这些部分：

- 功能
- 配置
- 请求格式
- 安装

如果脚本包含快捷键或持久化配置，也需要在 README 中明确写出。

## Reuse Rules

- 可复用的配置 modal 结构，优先抽到 `templates/`
- 可复用的 schema 字段定义，优先抽到 `templates/`
- 可复用的脚本头部或骨架，优先抽到 `templates/`
- 如果后续脚本偏离这些约定，需要在对应脚本 README 中说明原因
