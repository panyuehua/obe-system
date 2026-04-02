# OBE 教管一体化平台

基于成果导向教育（OBE）理念的教学质量管理平台，支持培养方案管理、课程目标对齐、达成度分析与持续改进全流程闭环。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | 原生 HTML + CSS + JavaScript，Tailwind CSS CDN |
| 后端 | Node.js + Express |
| 数据库 | SQLite（better-sqlite3） |

---

## 目录结构

```
OBE/
├── client/                 # 前端静态资源（由后端托管）
│   ├── index.html          # 首页概览（仪表盘）
│   ├── css/
│   │   ├── design-system.css   # 全局设计系统变量与组件样式
│   │   └── custom.css
│   ├── js/
│   │   ├── api.js          # 统一 API 客户端封装
│   │   └── app.js          # 全局组件：导航栏、Toast、Modal、工具函数
│   └── pages/
│       ├── majors.html         # 专业管理
│       ├── curriculum.html     # 培养方案（目标、毕业要求、指标点）
│       ├── courses.html        # 课程管理
│       ├── matrix.html         # 指标点×课程支撑矩阵
│       ├── analysis.html       # 达成度分析（雷达图、明细表）
│       ├── diagnosis.html      # 结构诊断报告
│       └── improvement.html    # CQI 持续改进计划
│
├── server/                 # 后端服务
│   ├── app.js              # Express 入口（端口 3000）
│   ├── package.json
│   ├── config/
│   │   └── database.js     # SQLite 连接配置（WAL 模式）
│   ├── db/
│   │   ├── migrate.js      # 建表脚本
│   │   ├── seed.js         # 示范数据
│   │   └── data/           # obe.db 运行时生成于此
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── routes/
│   │   ├── index.js        # 路由挂载总入口
│   │   ├── majors.js
│   │   ├── curriculum.js   # 版本、培养目标、毕业要求、指标点、支撑矩阵
│   │   ├── courses.js
│   │   ├── teaching.js     # 教学班、ILO、考核方案、成绩录入
│   │   ├── analysis.js     # 达成度计算、诊断、仪表盘
│   │   └── improvement.js  # CQI 改进计划 CRUD
│   ├── services/
│   │   ├── achievementCalc.js  # OBE 四层达成度计算引擎
│   │   └── diagnosisService.js # 结构性问题诊断
│   └── utils/
│       └── response.js     # 统一响应格式 { code, data, message }
│
└── 平台设计蓝图/            # 产品设计文档
```

---

## 快速启动

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 初始化数据库

```bash
# 建表
npm run migrate

# （可选）写入示范数据
npm run seed
```

### 3. 启动服务

```bash
# 生产模式
npm start

# 开发模式（nodemon 热重载）
npm run dev
```

服务启动后访问：**http://localhost:3000**

### 4. 数据库重置

```bash
# 删除旧数据库并重新建表 + 写入种子数据
npm run reset-db
```

> 注意：修改 `db/migrate.js` 中的表结构后，需执行 `npm run reset-db` 才能生效。

---

## API 概览

所有接口以 `/api` 为前缀，统一响应格式：

```json
{ "code": 0, "data": {}, "message": "success" }
```

| 路由前缀 | 说明 |
|---------|------|
| `GET /api/health` | 服务健康检查 |
| `/api/majors` | 专业 CRUD |
| `/api/curriculum` | 培养方案版本、培养目标、毕业要求、指标点、支撑矩阵 |
| `/api/courses` | 课程 CRUD |
| `/api/teaching` | 教学班、ILO、考核方案、成绩批量录入 |
| `/api/analysis` | 达成度计算、诊断报告、仪表盘数据 |
| `/api/improvement` | CQI 改进计划 CRUD + 状态流转 |

---

## OBE 逻辑链路

```
社会需求 → 培养目标 → 毕业要求 → 指标点 → 课程体系
                                              ↓
持续改进 ← 达成分析 ← 考核评价 ← 课程目标(ILO)
```

平台支持以上完整闭环的数据录入、计算与可视化。
