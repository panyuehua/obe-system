# OBE教管平台 — 数据库结构说明文档

> **文件位置**：`server/db/data/obe.db`（SQLite 3，WAL 模式，外键约束已启用）  
> **建表脚本**：`server/db/migrate.js`（执行 `node db/migrate.js` 创建/更新表结构）  
> **最后更新**：2026-04-02

---

## 数据库全局约定

| 约定 | 说明 |
|------|------|
| 主键 | 每张表均使用 `id INTEGER PRIMARY KEY AUTOINCREMENT` |
| 时间字段 | `created_at` / `updated_at` 均为 TEXT 类型，默认值 `datetime('now','localtime')` |
| 外键 | 全局启用 `PRAGMA foreign_keys = ON`，级联删除通过 `ON DELETE CASCADE` 声明 |
| 枚举值 | 用 TEXT 存储，具体取值范围见各表说明 |

---

## 表总览（共 22 张）

| # | 表名 | 所属模块 | 用途摘要 |
|---|------|----------|----------|
| 1 | `schools` | 基础组织 | 学校基本信息 |
| 2 | `colleges` | 基础组织 | 学院信息，隶属于学校 |
| 3 | `teachers` | 基础组织 | 教师信息，隶属于学院 |
| 4 | `students` | 基础组织 | 学生信息，关联学院与专业 |
| 5 | `majors` | 专业培养 | 专业信息，隶属于学院 |
| 6 | `curriculum_versions` | 专业培养 | 培养方案版本，每专业每届一版 |
| 7 | `training_objectives` | OBE体系 | 培养目标条目 |
| 8 | `graduation_requirements` | OBE体系 | 毕业要求（一级） |
| 9 | `gr_indicators` | OBE体系 | 毕业要求指标点（二级） |
| 10 | `courses` | 课程体系 | 课程基本信息 |
| 11 | `course_prerequisites` | 课程体系 | 先修课程关系（多对多） |
| 12 | `support_obj_gr` | 支撑关系 | 培养目标 ↔ 毕业要求支撑强度 |
| 13 | `support_indicator_course` | 支撑关系 | 指标点 ↔ 课程支撑权重 |
| 14 | `teaching_classes` | 教学执行 | 教学班（课程的具体开课实例） |
| 15 | `ilos` | 教学执行 | 课程目标 / ILO（预期学习结果） |
| 16 | `ilo_indicator_support` | 教学执行 | ILO ↔ 毕业要求指标点支撑权重 |
| 17 | `assessment_items` | 考核成绩 | 考核项（作业/测验/期末等） |
| 18 | `assessment_ilo_mapping` | 考核成绩 | 考核项 ↔ ILO 覆盖权重 |
| 19 | `scores` | 考核成绩 | 学生在各考核项的得分 |
| 20 | `improvement_plans` | 持续改进 | 专业/课程改进计划 |
| 21 | `integration_sync_logs` | 数据接入 | 数据同步操作日志 |
| 22 | `integration_config` | 数据接入 | 外部系统集成配置（键值对） |

---

## 一、基础组织结构

### 1. `schools` — 学校

存储学校基本信息，是整个平台组织架构的根节点。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `name` | TEXT | NOT NULL | 学校全称 |
| `short_name` | TEXT | | 学校简称 |
| `position` | TEXT | | 办学定位描述 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 2. `colleges` — 学院

隶属于学校的二级院系单位。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `school_id` | INTEGER | FK → schools, CASCADE | 所属学校 |
| `name` | TEXT | NOT NULL | 学院名称 |
| `code` | TEXT | | 学院代码 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 3. `teachers` — 教师

教师基本档案，用于教学班关联。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `college_id` | INTEGER | FK → colleges | 所属学院 |
| `teacher_no` | TEXT | UNIQUE | 教师工号 |
| `name` | TEXT | NOT NULL | 教师姓名 |
| `title` | TEXT | | 职称（讲师/副教授/教授等） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 4. `students` — 学生

学生基本档案，关联学院与专业。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `college_id` | INTEGER | FK → colleges | 所属学院 |
| `major_id` | INTEGER | FK → majors | 所属专业 |
| `student_no` | TEXT | UNIQUE, NOT NULL | 学号 |
| `name` | TEXT | NOT NULL | 学生姓名 |
| `grade` | INTEGER | | 入学年份（如 2023） |
| `class_name` | TEXT | | 行政班级名称 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

## 二、专业与培养方案

### 5. `majors` — 专业

专业基本信息，隶属于学院。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `college_id` | INTEGER | FK → colleges, CASCADE | 所属学院 |
| `name` | TEXT | NOT NULL | 专业名称 |
| `code` | TEXT | | 专业代码 |
| `degree_years` | INTEGER | DEFAULT 3 | 学制年数（3/4/5） |
| `cert_type` | TEXT | DEFAULT 'vocational' | 认证类型（vocational/engineering 等） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 6. `curriculum_versions` — 培养方案版本

每个专业按届次维护独立的培养方案版本，**每专业每届只允许一个版本**（UNIQUE 约束 `major_id + grade_year`）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `major_id` | INTEGER | FK → majors, CASCADE | 所属专业 |
| `version` | TEXT | NOT NULL | 版本号（如 "2023版"） |
| `grade_year` | INTEGER | NOT NULL | 适用年级（如 2023） |
| `status` | TEXT | DEFAULT 'draft' | 状态：`draft`（草稿）/ `active`（有效） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

## 三、OBE 培养体系

### 7. `training_objectives` — 培养目标

专业培养目标条目，与具体培养方案版本绑定。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `version_id` | INTEGER | FK → curriculum_versions, CASCADE | 所属培养方案 |
| `code` | TEXT | NOT NULL | 编号（如 "目标1"） |
| `description` | TEXT | NOT NULL | 目标描述文字 |
| `sort_order` | INTEGER | DEFAULT 0 | 排序序号 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 8. `graduation_requirements` — 毕业要求

毕业要求一级条目（对应工程认证12条或职教专业标准）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `version_id` | INTEGER | FK → curriculum_versions, CASCADE | 所属培养方案 |
| `code` | TEXT | NOT NULL | 编号（如 "GR1"） |
| `description` | TEXT | NOT NULL | 毕业要求描述 |
| `sort_order` | INTEGER | DEFAULT 0 | 排序序号 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 9. `gr_indicators` — 毕业要求指标点

毕业要求二级分解（指标点），是 OBE 达成度计算的核心粒度。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `gr_id` | INTEGER | FK → graduation_requirements, CASCADE | 所属毕业要求 |
| `code` | TEXT | NOT NULL | 编号（如 "GR1.1"） |
| `description` | TEXT | NOT NULL | 指标点描述 |
| `weight` | REAL | DEFAULT 1.0 | 在父毕业要求中的权重 |
| `threshold` | REAL | DEFAULT 0.60 | 达成度合格阈值（0~1） |
| `sort_order` | INTEGER | DEFAULT 0 | 排序序号 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

## 四、课程体系

### 10. `courses` — 课程

培养方案中的课程列表，包含学时、学分、课程性质等信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `version_id` | INTEGER | FK → curriculum_versions, CASCADE | 所属培养方案 |
| `code` | TEXT | NOT NULL | 课程编号 |
| `name` | TEXT | NOT NULL | 课程名称 |
| `credits` | REAL | DEFAULT 0 | 学分 |
| `total_hours` | INTEGER | DEFAULT 0 | 总学时 |
| `theory_hours` | INTEGER | DEFAULT 0 | 理论学时 |
| `practice_hours` | INTEGER | DEFAULT 0 | 实践学时 |
| `nature` | TEXT | DEFAULT 'required' | 课程性质：`required`（必修）/ `elective`（选修）/ `practice`（实践） |
| `semester` | INTEGER | DEFAULT 1 | 开设学期（第几学期） |
| `is_core` | INTEGER | DEFAULT 0 | 是否核心课程（0/1） |
| `course_group` | TEXT | | 课程归组（认证课组名称） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 11. `course_prerequisites` — 先修课程关系

记录课程之间的先修依赖关系（多对多联结表，无 id 字段，复合主键）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `course_id` | INTEGER | FK → courses, CASCADE | 当前课程 |
| `prereq_id` | INTEGER | FK → courses, CASCADE | 先修课程 |

> 复合主键：`(course_id, prereq_id)`

---

## 五、支撑关系（OBE 核心矩阵）

### 12. `support_obj_gr` — 培养目标 ↔ 毕业要求支撑

记录培养目标与毕业要求之间的支撑强度，用于生成目标-要求关联矩阵。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `objective_id` | INTEGER | FK → training_objectives, CASCADE | 培养目标 |
| `gr_id` | INTEGER | FK → graduation_requirements, CASCADE | 毕业要求 |
| `strength` | TEXT | DEFAULT 'H' | 支撑强度：`H`（强）/ `M`（中）/ `L`（弱） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |

> UNIQUE 约束：`(objective_id, gr_id)`

---

### 13. `support_indicator_course` — 指标点 ↔ 课程支撑

记录毕业要求指标点与课程之间的支撑权重，是达成度计算的关键映射。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `indicator_id` | INTEGER | FK → gr_indicators, CASCADE | 毕业要求指标点 |
| `course_id` | INTEGER | FK → courses, CASCADE | 支撑课程 |
| `weight` | REAL | DEFAULT 1.0 | 支撑权重（参与达成度加权计算） |
| `created_at` | TEXT | DEFAULT now | 创建时间 |

> UNIQUE 约束：`(indicator_id, course_id)`

---

## 六、教学执行层

### 14. `teaching_classes` — 教学班

课程在某学年/学期的具体开课实例，由特定教师授课。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `course_id` | INTEGER | FK → courses | 对应课程 |
| `teacher_id` | INTEGER | FK → teachers | 授课教师 |
| `semester` | INTEGER | NOT NULL | 学期（1/2） |
| `year` | INTEGER | NOT NULL | 学年（如 2023） |
| `class_name` | TEXT | | 教学班名称 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 15. `ilos` — 课程目标 / ILO

Intended Learning Outcomes，预期学习结果。每个教学班可独立配置课程目标。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `class_id` | INTEGER | FK → teaching_classes, CASCADE | 所属教学班 |
| `code` | TEXT | NOT NULL | 编号（如 "ILO1"） |
| `description` | TEXT | NOT NULL | 目标描述 |
| `bloom_level` | TEXT | DEFAULT 'apply' | Bloom 认知层级：`remember`/`understand`/`apply`/`analyze`/`evaluate`/`create` |
| `sort_order` | INTEGER | DEFAULT 0 | 排序序号 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 16. `ilo_indicator_support` — ILO ↔ 指标点支撑

课程目标 ILO 与毕业要求指标点之间的支撑权重，打通课程层到专业层的 OBE 计算链路。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `ilo_id` | INTEGER | FK → ilos, CASCADE | 课程目标 |
| `indicator_id` | INTEGER | FK → gr_indicators, CASCADE | 毕业要求指标点 |
| `weight` | REAL | DEFAULT 1.0 | 支撑权重 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |

> UNIQUE 约束：`(ilo_id, indicator_id)`

---

## 七、考核与成绩

### 17. `assessment_items` — 考核项

教学班下的各类考核任务定义，权重之和应为 1.0。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `class_id` | INTEGER | FK → teaching_classes, CASCADE | 所属教学班 |
| `name` | TEXT | NOT NULL | 考核项名称（如 "期末考试"） |
| `type` | TEXT | DEFAULT 'homework' | 考核类型：`homework`/`quiz`/`exam`/`project`/`lab` |
| `weight` | REAL | NOT NULL | 在总成绩中的权重（0~1，各项之和应为1） |
| `max_score` | REAL | DEFAULT 100 | 满分值 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

### 18. `assessment_ilo_mapping` — 考核项 ↔ ILO 覆盖权重

记录每个考核项对哪些课程目标 ILO 进行了考核及其权重分配。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `assessment_id` | INTEGER | FK → assessment_items, CASCADE | 考核项 |
| `ilo_id` | INTEGER | FK → ilos, CASCADE | 覆盖的课程目标 |
| `weight` | REAL | DEFAULT 1.0 | 该考核项对此 ILO 的覆盖权重 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |

> UNIQUE 约束：`(assessment_id, ilo_id)`

---

### 19. `scores` — 学生成绩

学生在各考核项的实际得分记录，是达成度计算的原始数据来源。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `student_id` | INTEGER | FK → students | 学生 |
| `class_id` | INTEGER | FK → teaching_classes | 教学班 |
| `assessment_id` | INTEGER | FK → assessment_items | 考核项 |
| `score` | REAL | NOT NULL | 实际得分 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

> UNIQUE 约束：`(student_id, assessment_id)`

---

## 八、持续改进

### 20. `improvement_plans` — 改进计划

记录针对专业或课程的持续改进措施，支持状态追踪和跨期对比。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `version_id` | INTEGER | FK → curriculum_versions, CASCADE | 关联培养方案版本 |
| `title` | TEXT | NOT NULL | 改进计划标题 |
| `target_type` | TEXT | DEFAULT 'general' | 改进对象类型：`general`/`course`/`gr`/`indicator` |
| `description` | TEXT | | 改进措施详细描述 |
| `responsible_person` | TEXT | | 责任人 |
| `academic_year` | TEXT | | 所属学年（如 "2023-2024"） |
| `due_date` | TEXT | | 预计完成日期 |
| `status` | TEXT | DEFAULT 'pending' | 状态：`pending`（待实施）/ `in_progress`（进行中）/ `completed`（已完成）/ `cancelled`（已取消） |
| `note` | TEXT | | 备注 |
| `created_at` | TEXT | DEFAULT now | 创建时间 |
| `updated_at` | TEXT | DEFAULT now | 更新时间 |

---

## 九、数据接入中枢

### 21. `integration_sync_logs` — 数据同步日志

记录所有外部系统数据同步操作的执行历史，用于数据质量监控和问题溯源。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `source` | TEXT | NOT NULL | 数据来源：`academic`（教务系统）/ `lms`（教学平台）/ `industry`（行业数据） |
| `data_type` | TEXT | NOT NULL | 数据类型：`schools`/`students`/`courses`/`curriculum`/`grades`/`tasks`/`scores`/`behavior`/`resources`/`jobs`/`policy` |
| `status` | TEXT | DEFAULT 'success' | 同步状态：`success`（成功）/ `partial`（部分成功）/ `failed`（失败） |
| `records` | INTEGER | DEFAULT 0 | 本次同步涉及的记录数 |
| `error_msg` | TEXT | | 失败时的错误信息 |
| `triggered_by` | TEXT | DEFAULT 'manual' | 触发方式：`manual`（手动）/ `scheduled`（定时）/ `import`（CSV导入） |
| `created_at` | TEXT | DEFAULT now | 操作时间 |

---

### 22. `integration_config` — 集成配置

以键值对方式存储各外部系统的连接参数配置（API地址、密钥、同步选项等）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO | 主键 |
| `config_group` | TEXT | NOT NULL | 配置分组：`academic`（教务系统）/ `lms`（教学平台）/ `industry`（行业数据） |
| `config_key` | TEXT | NOT NULL | 配置键名（如 `base_url`、`api_key`、`platform`、`sync_types`、`keywords`） |
| `config_value` | TEXT | | 配置值（明文存储，敏感信息建议生产环境加密） |
| `updated_at` | TEXT | DEFAULT now | 最后更新时间 |

> UNIQUE 约束：`(config_group, config_key)`

---

## OBE 达成度计算数据流

```
scores（原始得分）
    ↓ 除以 assessment_items.max_score
assessment_ilo_mapping（考核项→ILO，weight）
    ↓ 加权聚合
ilos 达成度
    ↓ 通过 ilo_indicator_support（ILO→指标点，weight）
gr_indicators 达成度
    ↓ 通过 support_indicator_course（指标点→课程，weight）
graduation_requirements 达成度
    ↓ 通过 support_obj_gr（毕业要求→培养目标，strength H/M/L）
training_objectives 达成度
```

---

## 变更历史

| 日期 | 变更内容 | 影响表 |
|------|----------|--------|
| 2026-04-02 | 初始建库，建立全部基础表 | 所有表 |
| 2026-04-02 | 新增数据接入中枢模块，增加同步日志与集成配置表 | `integration_sync_logs`、`integration_config` |
