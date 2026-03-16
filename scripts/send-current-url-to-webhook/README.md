# Send Current URL to Webhook

在页面右上角添加一个始终可见的折叠式控制条。默认只露出一小段边缘，鼠标移入后向左滑出完整控件区。

## 功能

- 固定在页面右上角，所有网页都可见
- 默认折叠，只显示一小段边缘
- 鼠标悬停时滑出，鼠标移开后自动收回
- 提供 3 个纯图标按钮：`pin`、`send`、`config`
- `pin` 点击后保持展开，再点一次取消固定
- `config` 按钮和 `Alt+C` 都可以打开配置弹窗
- 按 `Alt+C` 打开配置弹窗，macOS 上对应 `Option+C`
- 配置保存在 Tampermonkey 存储中，整个脚本全局共用一次配置
- 点击后使用 `POST` 发送当前页面 URL
- 请求体中的字段名固定为 `site`
- 支持 `Basic Auth`
- 支持按域名白名单启用
- 使用 `GM_xmlhttpRequest`，避免普通 `fetch` 的跨域限制
- 配置界面由字段 schema 驱动，后续脚本可以复用同样模式扩展

## 配置

按 `Alt+C` 打开配置弹窗并填写：

说明：

- `webhookUrl`：接收请求的 webhook 地址
- `auth.user`：Basic Auth 用户名
- `auth.password`：Basic Auth 密码
- `enabledDomains`：启用脚本的域名列表

保存方式：

- 点击弹窗中的 `Save`
- 保存后立即生效
- 配置存储在脚本内部，所有页面共享
- 右上角控制条始终显示
- 域名名单只控制当前页面是否允许点击 `send`

域名匹配规则：

- 填 `example.com` 时，`example.com` 和任意子域名都会匹配
- 填 `news.example.org` 时，仅该域名及其子域名匹配
- 填 `*` 时，所有域名都启用

## 请求格式

请求方法：

```http
POST
```

请求头：

```text
Content-Type: application/json
Authorization: Basic <base64(user:password)>
```

请求体：

```json
{
  "site": "https://current-page.example.com/path"
}
```

## 安装

1. 安装浏览器扩展 Tampermonkey
2. 新建脚本
3. 将 [`send-current-url-to-webhook.user.js`](/Volumes/local/Project/github/tampermonkey-projects/scripts/send-current-url-to-webhook/send-current-url-to-webhook.user.js) 内容粘贴进去
4. 保存脚本
5. 打开任意页面，找到右上角露出的一小段控制条
6. 点击 `config` 图标或按 `Alt+C`
7. 填写配置并保存
8. 在已启用的域名页面点击 `send` 图标发送当前 URL
