# 🏆 2026 老同学世界杯联赛

老同学微信群的世界杯娱乐竞猜战报网站。

## 项目说明

这是一个纯静态网站，通过 GitHub Pages 部署。

- 所有数据在 `data.json` 中手动维护
- 无需后端、无需数据库、无需登录
- 纯娱乐用途

## 文件结构

```
├── index.html       # 主页面
├── style.css        # 样式
├── script.js        # 交互逻辑
├── data.json        # 手动维护的数据
├── assets/          # 图片资源
│   ├── avatars/     # 压缩后的头像
│   └── ...          # 背景图、Logo 等
└── README.md        # 本文件
```

## 每日更新方法

### 方法一：一键更新脚本（推荐）

在项目目录下运行：

```bash
python3 update_data.py
```

按提示输入比赛结果和积分，脚本会自动更新 `data.json` 并推送到 GitHub。

### 方法二：手动更新

1. 编辑 `data.json`
2. 执行 `git add . && git commit -m "更新数据" && git push`

## 技术栈

- HTML + CSS + Vanilla JavaScript
- GitHub Pages 部署
- 无需任何框架或后端

## 注意事项

- 头像图片放在 `assets/avatars/` 目录
- 头像文件命名必须和 `data.json` 中的 `name` 一致（如 `阿全.jpg`）
- 支持 19 位老同学

## 开发

请参考 `prd.md`（产品需求文档）和 `CODING_GUIDE.md`（开发规范）。
