# Project Structure

这个仓库用于存放可独立维护的 Tampermonkey 脚本，并为后续新增脚本保持统一结构。

## Directory Layout

- `scripts/<script-name>/`
  - `<script-name>.user.js`
  - `README.md`
- `docs/`
  - 项目约定、结构规范、实现规范
- `templates/`
  - 可复用模板和代码片段
- `README.md`
  - 仓库总说明和脚本索引表

## Rules

- 每个脚本必须放在独立子目录中
- 每个脚本目录至少包含一个 `*.user.js` 文件和一个 `README.md`
- 根目录 `README.md` 必须维护统一脚本总表
- 新增脚本后，需要同步更新根目录脚本总表
- 通用规则优先写入 `docs/`
- 可复用代码优先沉淀到 `templates/`

## Naming

- 目录名使用 kebab-case
- 脚本文件名与目录名保持一致
- README 只描述当前脚本，不混入其他脚本说明
- 脚本标题可以是可读英文名，但目录和文件名保持稳定

## Documentation Workflow

新增脚本时，建议按这个顺序执行：

1. 先阅读 `docs/project-structure.md`
2. 再阅读 `docs/script-conventions.md`
3. 按需复用 `templates/` 中的片段
4. 新建 `scripts/<script-name>/`
5. 写脚本和子 README
6. 更新根目录 `README.md` 的脚本总表

## Consistency Goals

- 配置方式尽量一致
- UI 交互方式尽量一致
- 文档结构尽量一致
- 通用逻辑尽量通过模板或片段复用

