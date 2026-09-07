# 个人记账 · Personal Finance

![license](https://img.shields.io/github/license/boycemo/finance-app)
![react](https://img.shields.io/badge/React-18-61dafb)
![typescript](https://img.shields.io/badge/TypeScript-72.9%25-blue)
![node](https://img.shields.io/badge/Node-Express-339933)
![sqlite](https://img.shields.io/badge/DB-SQLite-003B57)
![offline](https://img.shields.io/badge/data-local%20only-brightgreen)
![size](https://img.shields.io/github/size/boycemo/finance-app/index.html)

本地化、轻量级的个人收支管理 Web 应用。前端 React + Tailwind + shadcn/ui + Recharts，后端 Node + Express + SQLite。**数据持久化在本地 SQLite 文件，浏览器清缓存不影响**。

> 📸 界面截图暂未提供(避免示例数据与真实账户信息混淆)。可参考 [技术栈](#-技术栈) + [功能](#-功能) 章节了解 UI 能力;或本地 `start.bat` 启动后查看。

## ⚡ 快速开始（推荐）

双击 `start.bat` —— 自动检查依赖、自动启动前后端、自动打开提示。

> 首次使用请先双击 `install.bat` 装依赖。

## 📦 脚本清单

| 脚本 | 用途 |
|------|------|
| `start.bat`   | 一键启动前后端（端口 5173/3001） |
| `install.bat` | 安装所有依赖（首次使用跑一次） |
| `stop.bat`    | 停止所有相关进程 |
| `backup.bat`  | 备份数据库到 `Backups/finance-YYYYMMDD-HHmmss.db`，支持拖入自定义目标目录 |

### 手动启动

```bash
# 装依赖（首次）
npm install
npm --prefix server install

# 一键起前后端
npm run dev:all

# 或分两个终端
# 终端 1: cd server && npm run dev
# 终端 2: cd .. && npm run dev
```

## ✨ 功能

### P0 核心

- 录入：收入/支出切换，金额/日期/分类/备注
- 月度概览：3 张数字卡片 + 12 月折线图 + 分类柱状图
- 明细列表：按月 + 按分类筛选

### P1 进阶

- 饼图（分类占比）
- CSV 导出（含 BOM，Excel 友好）
- 编辑/删除

### P2 账户余额（资产）

- **账户管理**：自定义账户（支付宝 / 京东金融 / 同花顺…），支持新增 / 编辑 / 停用 / 删除
- **账户类型**：货币资金（cash）/ 投资账户（investment）/ 基金理财（fund）/ 其他（other）
- **小项目（子账户）**：每个账户下可自定义小项目（余额宝 / 股票 / 基金…），预置常见小项目，可**独立开关启用/停用**，可新增 / 编辑 / 删除，删除连带余额记录
- **余额记录**：按账户或小项目记录余额快照（金额 + 日期 + 备注），历史全部保留
- **账户合计**：账户余额 = 其启用小项目的余额合计（未启用小项目的账户直接记余额）
- **资产总览**：总资产 + 按类型汇总，已录入账户计数
- **小项目折叠**：账户下小项目列表默认折叠，点击「展开」查看；鼠标悬停账户可预览余额明细
- **多笔相加**：记余额弹窗支持输入多笔金额自动求和保存
- **批量录入余额**：一次性勾选多个账户/小项目分别填金额，统一日期+备注（月底盘点神器），支持「全部预填上月」一键带入
- **历史弹窗**：查看 / 删除某个账户（含小项目标识）的余额历史
- **填上期快捷**：打开记录弹窗自动预填最近一次余额，改数即存
- **余额趋势图**：近 12 个月余额折线图，可切换「全部合计 / 单个账户」
- **月度余额报表**：月份 × 账户矩阵（当月口径，无记录月份为 0），含合计列与环比变化
- **参照上月补全**：一键把本月未录入的账户/小项目，按上月余额生成快照
- **导出/导入备份**：完整备份（账户/子账户/余额/记录）为 JSON，可一键还原
- **清空数据**：页面底部「清空全部数据」需输入密码（moraoming）确认，清空记录/余额/账户并恢复默认

### 持久化

- 数据存本地 SQLite (`server/finance.db`)，WAL 模式
- 金额以「分」为单位存储
- 备份：直接复制 `finance.db`，或跑 `backup.bat`
- 后端状态指示器（绿点/红点 + 错误条 + 重试）

## 🛠 技术栈

**前端**：React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts + Lucide
**后端**：Node.js + Express + better-sqlite3 + CORS

## 📁 项目结构

```
finance-app/
├── src/                    # 前端
│   ├── components/
│   │   ├── ui/             # shadcn 风格基础组件
│   │   ├── Dashboard.tsx
│   │   ├── StatCards.tsx
│   │   ├── TrendChart.tsx
│   │   ├── CategoryBarChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   ├── MonthOverview.tsx
│   │   ├── RecordForm.tsx
│   │   └── RecordList.tsx
│   ├── hooks/useRecords.ts
│   ├── lib/utils.ts
│   ├── types/index.ts
│   ├── utils/{api,csv,date}.ts
│   ├── App.tsx / main.tsx / index.css
├── server/                 # 后端
│   ├── index.js            # Express 入口
│   ├── db.js               # SQLite 初始化
│   ├── finance.db          # 数据文件（自动生成）
│   └── package.json
├── start.bat               # ⭐ 一键启动
├── install.bat             # ⭐ 装依赖
├── stop.bat                # ⭐ 停服务
├── backup.bat              # ⭐ 备份数据库
├── package.json
└── README.md
```

## 🔌 REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/health`          | 健康检查 |
| GET    | `/api/categories`      | 分类列表 |
| GET    | `/api/records`         | 记录列表（按日期倒序） |
| POST   | `/api/records`         | 新增 |
| PUT    | `/api/records/:id`     | 更新 |
| DELETE | `/api/records/:id`     | 删除单条 |
| DELETE | `/api/records`         | 清空全部 |
| GET    | `/api/accounts`        | 账户列表 |
| POST   | `/api/accounts`        | 新增账户 |
| PUT    | `/api/accounts/:id`    | 更新账户 |
| DELETE | `/api/accounts/:id`    | 删除账户（连带余额） |
| GET    | `/api/sub-accounts`    | 全部小项目 |
| GET    | `/api/accounts/:id/sub-accounts` | 某账户小项目 |
| POST   | `/api/sub-accounts`    | 新增小项目 |
| PUT    | `/api/sub-accounts/:id` | 更新小项目（含开关 enabled） |
| DELETE | `/api/sub-accounts/:id` | 删除小项目（连带余额） |
| GET    | `/api/balances`        | 全部余额快照 |
| GET    | `/api/accounts/:id/balances` | 某账户余额历史 |
| POST   | `/api/balances`        | 新增余额快照（可带 subAccountId） |
| POST   | `/api/balances/batch`  | 批量新增余额快照 |
| PUT    | `/api/balances/:id`    | 更新余额快照 |
| DELETE | `/api/balances/:id`    | 删除余额快照 |
| POST   | `/api/balances/batch-delete` | 批量删除余额快照 |
| GET    | `/api/backup`          | 导出全量备份（JSON） |
| POST   | `/api/restore`         | 导入还原（覆盖当前数据） |
| POST   | `/api/clear-all`       | 清空全部数据（恢复默认） |

## ❓ 常见问题

**后端没启动？**
> 跑 `start.bat` 即可。前端会自动检测并显示错误条 + 重试按钮。

**数据怎么迁移？**
> 复制 `server/finance.db`（+ `finance.db-wal` 如有）到目标机器的 `server/` 目录。

**端口被占？**
> 后端：`$env:PORT=3002; npm --prefix server start`
> 前端：改 `vite.config.ts` 的 `server.port`，同时改前端 `VITE_API_BASE` 环境变量。

**想远程访问？**
> 当前监听 `127.0.0.1`。改 `server/index.js` 的 `listen(PORT, '127.0.0.1')` 为 `'0.0.0.0'`，注意加鉴权。
