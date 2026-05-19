# 🏆 老同学·世界杯竞猜比赛 — Handoff 文档

> **生成日期**：2026-05-19  
> **GitHub**：[manhvanvanh-afk/MJMFB](https://github.com/manhvanvanh-afk/MJMFB)  
> **线上地址**：https://manhvanvanh-afk.github.io/MJMFB/

---

## 一、项目概述

老同学微信群在 2026 世界杯期间的娱乐竞猜互动网站。

### 技术栈

| 技术 | 用途 |
|------|------|
| HTML + CSS + Vanilla JS | 前端页面 |
| JSON | 所有数据存储 |
| GitHub Pages | 免费部署 |
| Python | 数据更新脚本 |

### 用户

19 位老同学（群昵称+已处理头像）。

---

## 二、文件结构

```
project-root/
├── index.html           # 主页面（单页）
├── style.css            # 样式（深色体育酒吧风格）
├── script.js            # 交互逻辑（倒计时+数据渲染）
├── data.json            # 所有数据（赛程/排行榜/投注/锐评）
│
├── assets/
│   ├── hero-banner.jpg       # Hero 背景图
│   ├── worldcup-logo.jpeg    # 世界杯 Logo
│   ├── worldcup-logo2.avif   # Logo 备用
│   ├── stadium-bg.jpg        # 赛场背景图
│   ├── usa-bg.jpg            # 美国背景
│   ├── canada-bg.jpg         # 加拿大背景
│   ├── mexico-bg.jpg         # 墨西哥背景
│   ├── share-card.png        # 分享卡片（800x1000 含二维码）
│   ├── og-image.jpg          # 社交分享预览图（1200x630）
│   ├── qr-code.png           # 独立二维码
│   └── avatars/              # 19 位同学头像（120x120）
│
├── update_data.py       # 每日更新脚本（自动推送 GitHub）
├── prd.md               # 产品需求文档
├── CODING_GUIDE.md      # 开发规范
├── README.md            # 项目简介
└── handoff.md           # 本文档
```

---

## 三、已实现功能

### 页面模块（按显示顺序）

| 模块 | 说明 |
|------|------|
| 🏟️ **Hero 顶部** | 草坪纹理+动态灯光+开幕倒计时 |
| 📋 **昨日赛果** | 自动筛选昨天日期的比赛，显示比分 |
| ⚽ **今日比赛** | 自动筛选今天日期的比赛 |
| 💰 **昨日赢家** | 投注明细：串关/单场/猜比分，按净赚排序 |
| 🏅 **总排行榜** | 19 人按积分排序，前三金/银/铜牌 |
| 🤡 **毒奶榜** | 搞笑反向预测记录 |
| 🎙️ **AI 锐评** | 毒舌体育解说风评论 |
| 🌟 **今日 MVP** | 每日最佳发光卡片 |
| 🗓️ **完整赛程表** | 轮次标签切换，小组赛→淘汰赛 |

### 特色功能

- **国旗 Emoji**：48 支参赛队自动匹配国旗
- **骨架屏加载**：数据加载前占位，体验流畅
- **移动端适配**：微信内浏览、iPhone、小屏均适配
- **社交分享标签**：微信/浏览器分享显示标题+描述+封面图
- **开赛倒计时**：实时倒计时距 2026-06-11 开幕

---

## 四、数据格式

### data.json

```json
{
  "schedule": [
    {
      "id": 1,
      "group": "A",
      "matchday": 1,
      "date": "2026-06-11",
      "time": "18:00",
      "home": "墨西哥",
      "away": "南非",
      "score": "-"
    }
  ],
  "leaderboard": [
    { "name": "阿全", "score": 0, "today": 0 }
  ],
  "yesterdayBets": [
    {
      "name": "佑仔",
      "bets": [
        { "type": "串关", "detail": "8串1", "matches": "8场比赛串联", "amount": 200, "result": "中", "payout": 30200 }
      ],
      "totalBet": 200,
      "totalWon": 30200,
      "netProfit": 30000
    }
  ],
  "curseRanking": [],
  "aiComments": [],
  "mvp": ""
}
```

### 投注类型说明

| type | detail | 示例 |
|------|--------|------|
| `单场` | `猜胜负` / `猜比分` | 墨西哥 vs 韩国 猜胜负 |
| `串关` | `8串1` / `10串1` | 多场比赛串联 |

---

## 五、每日运营流程

### 日常更新（用户发消息给 Codex）

用户每天在微信群收完数据后，直接告诉 Codex，格式如下：

```
昨天比赛：
墨西哥 2:1 韩国
加拿大 1:1 卡塔尔

佑仔 8串1 200分 中了 赚3万
凡强 10串1 300分 中了 赚40万
```

Codex 负责：
1. 更新 data.json
2. 自动计算排行榜
3. 编写毒奶榜和 AI 锐评文案
4. 推送 GitHub，网站自动更新

### 一键脚本（备用）

```bash
cd /Users/guolong/Documents/MJMFB
~/bin/python3 update_data.py
```

按提示输入：
- 比赛比分（从赛程表选编号）
- 每人投注情况
- 自动保存并推送

---

## 六、已知问题和后续

### 当前问题

| 问题 | 状态 |
|------|------|
| 微信分享卡片可能缓存旧图 | 发到文件传输助手点开一次即可刷新 |
| 赛程数据需从 Wikipedia 爬取 | 已爬取 72 场小组赛，淘汰赛为占位 |
| 自动爬比分功能 | 世界杯开始后开发，目标源 eblcu.net |

### 待优化

- [ ] 世界杯开始后自动爬取比分
- [ ] 淘汰赛阶段自动填充对阵
- [ ] 个人页面（历史战绩/命中率）
- [ ] 世界杯回忆馆（赛后纪念）

---

## 七、开发说明

### 本地预览

```bash
cd /Users/guolong/Documents/MJMFB
python3 -m http.server 8888
# 打开 http://localhost:8888
```

### 部署

推送 main 分支到 GitHub 即可，GitHub Pages 自动更新。

### 代码风格

- 纯 HTML/CSS/JS，无框架
- 深色主题，CSS 变量管理配色
- 所有数据从 data.json 动态加载
- 移动端优先

---

## 八、关键联系人

- **开发者**：Codex AI Agent
- **当前仓库**：`manhvanvanh-afk/MJMFB`
- **域名**：GitHub Pages（自定义域名可选）

---

*文档结束 · 2026 老同学世界杯竞猜比赛 🏆*
