# Send Current URL to Webhook

在页面右上角添加一个可滑出的按钮。鼠标移入时按钮完整展开，平时只显示右侧一小段边缘。点击后会把当前页面 URL 发送到指定 webhook。

## 功能

- 固定在页面右上角
- 悬停时滑出，离开时收回
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
- 域名名单只控制右上角发送按钮是否显示，不影响 `Alt+C` 打开配置界面

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
5. 打开任意页面，按 `Alt+C`
6. 填写配置并保存
7. 刷新目标页面
