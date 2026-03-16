# Templates

这个目录用于保存可复用模板和片段，帮助后续新增脚本时保持一致性。

## Files

- `tampermonkey-script-skeleton.user.js`
  - 新脚本的基础骨架
- `config-schema.snippet.js`
  - schema 驱动配置字段定义片段
- `config-modal.snippet.js`
  - overlay + modal 配置界面片段
- `floating-dock.snippet.js`
  - 常驻右上角折叠 dock 片段
- `script-readme-template.md`
  - 子脚本 README 模板

使用方式：

- 先阅读 `docs/` 中的规则
- 再从这个目录挑选最接近的模板或片段复用
- 模板是起点，不是硬性限制；但默认应优先保持一致
