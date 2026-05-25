# MES 数据关联全景图

> 基于数据库 YAML 字段定义和 MongoDB 集合结构综合分析。
> 2026-05-22 更新（完整版 v2.0）

---

## 一、对象关系总图

```
┌─────────────────────────────────────────────────────────────────┐
│                        核心业务流程                               │
│                                                                  │
│  mes_work_orders (生产工单)                                        │
│    ├── [md] mes_production_reports (报工记录) ← work_order        │
│    ├── [lk] mes_routings (工艺路线) ← routing                     │
│    ├── [lk] mes_equipment (设备) ← equipment                      │
│    ├── [lk] mes_tasks (工人任务) ← work_order                     │
│    ├── [lk] mes_inspection_records (检验记录) ← work_order        │
│    ├── [lk] mes_defects (缺陷登记) ← work_order                   │
│    └── [lk] mes_nonconformance (不合格处理) ← work_order          │
│                                                                  │
│  mes_routings (工艺路线)                                          │
│    ├── [md] mes_operations (工序定义) ← routing                   │
│    │    └── [lk] mes_work_centers (工作中心) ← work_center        │
│    │         └── [lk] mes_workshops (车间) ← workshop             │
│    └── [lk] mes_materials (物料) ← product                        │
│                                                                  │
│  mes_materials (物料主数据)                                        │
│    ├── [lk] mes_bom_items (BOM清单) ← product / component        │
│    └── [lk] mes_inventory (线边库存) ← material                   │
│                                                                  │
│  mes_tasks (工人任务)                                              │
│    ├── [lk] mes_work_orders (生产工单) ← work_order               │
│    ├── [lk] mes_operations (工序) ← operation                     │
│    ├── [lk] mes_workshops (车间) ← workshop                      │
│    └── [lk] mes_equipment (设备) ← equipment                      │
│                                                                  │
│  mes_work_centers (工作中心)                                       │
│    └── [lk] mes_workshops (车间) ← workshop                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        质量管控流程                               │
│                                                                  │
│  mes_inspection_records (检验记录)                                 │
│    ├── [lk] mes_defects (缺陷登记) ← inspection                  │
│    ├── [lk] mes_work_orders (工单) ← work_order                  │
│    └── [lk] mes_equipment (设备) ← equipment                     │
│                                                                  │
│  mes_defects (缺陷登记)                                           │
│    ├── [lk] mes_nonconformance (不合格处理) ← defect              │
│    ├── [lk] mes_work_orders (工单) ← work_order                  │
│    └── [lk] mes_inspection_records (检验记录) ← inspection        │
│                                                                  │
│  mes_nonconformance (不合格处理)                                    │
│    ├── [lk] mes_defects (缺陷) ← defect                           │
│    └── [lk] mes_work_orders (工单) ← work_order                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        设备管理流程                               │
│                                                                  │
│  mes_equipment (设备台账)                                         │
│    ├── [lk] mes_maintenance_records (维保记录) ← equipment       │
│    ├── [lk] mes_equipment_faults (故障报修) ← equipment          │
│    ├── [lk] mes_inspection_records (检验记录) ← equipment         │
│    ├── [lk] mes_production_reports (报工记录) ← equipment        │
│    ├── [lk] mes_tasks (工人任务) ← equipment                      │
│    └── [lk] mes_work_orders (工单) ← equipment                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        车间管理流程                               │
│                                                                  │
│  mes_workshops (车间)                                             │
│    ├── [lk] mes_work_centers (工作中心) ← workshop                │
│    └── [lk] mes_tasks (工人任务) ← workshop                       │
└─────────────────────────────────────────────────────────────────┘

图例：[md] = master_detail（主子明细，级联删除） [lk] = lookup（引用）
      箭头指向 = "被引用方"，即 A → B 表示 A 引用了 B
```

---

## 二、对象字段详细关联表

### 生产执行域

**mes_work_orders（生产工单）** — 核心实体，15 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| order_number | autonumber | — | 工单编号，WO-{YYYY}{MM}{DD}-{0000}，is_name |
| name | text | — | 工单名称 |
| status | select | — | 待下达/已下达/执行中/已完成/已取消 |
| priority | select | — | 高/中/低 |
| **routing** | **lookup** | **mes_routings** | 工艺路线 |
| **equipment** | **lookup** | **mes_equipment** | 生产设备 |
| planned_qty | number | — | 计划数量 |
| completed_qty | number | — | 已完成数量 |
| defect_qty | number | — | 缺陷数量 |
| planned_start_date | datetime | — | 计划开始时间 |
| planned_end_date | datetime | — | 计划结束时间 |
| actual_start_date | datetime | — | 实际开始时间 |
| actual_end_date | datetime | — | 实际结束时间 |
| assignee | lookup | users | 负责人 |
| description | textarea | — | 备注 |

U8 同步字段：uf_mo_id（mom_order.MoId）、uf_so_code（销售订单号）

**mes_production_reports（报工记录）** — 12 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| name | text | — | 报工名称 |
| **work_order** | **master_detail** | **mes_work_orders** | ⭐ 所属工单（级联删除） |
| **operation** | **lookup** | **mes_operations** | 工序 |
| **equipment** | **lookup** | **mes_equipment** | 使用设备 |
| operator | lookup | users | 操作工 |
| report_date | datetime | — | 报工时间 |
| good_qty | number | — | 合格数量 |
| defect_qty | number | — | 缺陷数量 |
| refused_qty | number | — | 拒收数量 |
| rework_qty | number | — | 返工数量 |
| labor_hours | number | — | 工时（小时） |
| description | textarea | — | 备注 |

U8 同步字段：uf_transform_id（sfc_optransform.TransformId）

**mes_tasks（工人任务）** — 14 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| task_number | autonumber | — | 任务编号 TK-{YYYY}{MM}{DD}-{0000}，is_name |
| name | text | — | 任务名称 |
| **work_order** | **lookup** | **mes_work_orders** | 生产工单 |
| **operation** | **lookup** | **mes_operations** | 工序 |
| **workshop** | **lookup** | **mes_workshops** | 车间 |
| **worker** | **lookup** | **users** | 工人 |
| **equipment** | **lookup** | **mes_equipment** | 设备 |
| status | select | — | 待领工/进行中/已完成/已暂停/异常 |
| planned_qty | number | — | 计划数量 |
| completed_qty | number | — | 已完成数量 |
| defect_qty | number | — | 缺陷数量 |
| start_time | datetime | — | 开始时间 |
| end_time | datetime | — | 结束时间 |
| description | textarea | — | 备注 |

**mes_routings（工艺路线）** — 8 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| routing_number | autonumber | — | 路线编号 RT-{0000}，is_name |
| name | text | — | 路线名称 |
| **product** | **lookup** | **mes_materials** | 关联物料 |
| routing_status | select | — | 草稿/已审核/已发布/已停用 |
| version | number | — | 版本号 |
| effective_date | date | — | 生效日期 |
| description | textarea | — | 描述 |
| uf_prouting_id | text | — | U8 同步 ID |

**mes_operations（工序定义）** — 9 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| operation_code | autonumber | — | 工序编号 OP-{0000} |
| name | text | — | 工序名称 |
| **routing** | **master_detail** | **mes_routings** | ⭐ 所属路线（级联删除） |
| sequence_no | number | — | 工序序号 |
| **work_center** | **lookup** | **mes_work_centers** | 工作中心 |
| standard_time | number | — | 标准工时（分钟） |
| is_subcontract | boolean | — | 是否外协 |
| description | textarea | — | 作业指导 |
| uf_operation_id | text | — | U8 同步 ID |

**mes_work_centers（工作中心）** — 4 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| name | text | — | 名称，is_name |
| wc_code | text | — | 工作中心编码 |
| wc_name | text | — | 工作中心名称 |
| **workshop** | **lookup** | **mes_workshops** | 所属车间 |

U8 同步字段：uf_wc_id（sfc_workcenter.WcId）

**mes_workshops（车间管理）** — 4 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| workshop_code | text | — | 车间编码，is_name |
| name | text | — | 车间名称 |
| supervisor | lookup | users | 主管 |
| description | textarea | — | 备注 |

---

### 物料管理域

**mes_materials（物料主数据）** — 8 个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| material_code | autonumber | 物料编码 MTL-{0000}，is_name |
| name | text | 物料名称 |
| material_type | select | 原材料/半成品/成品/辅料/备件 |
| specification | text | 规格型号 |
| unit | select | 个/件/kg/m/L |
| description | textarea | 描述 |
| inv_class | text | 存货分类（U8 同步） |
| uf_inv_code | text | U8 存货编码（同步关联键） |

**mes_bom_items（BOM 清单）** — 10 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| bom_number | autonumber | — | BOM 编号，is_name |
| name | text | — | BOM 名称 |
| **product** | **lookup** | **mes_materials** | ⭐ 父件物料 |
| **component** | **lookup** | **mes_materials** | ⭐ 子件物料 |
| quantity | number | — | 用量 |
| unit | select | — | 单位 |
| level | number | — | BOM 层级 |
| op_seq | number | — | 工序序号 |
| effective_date | date | — | 生效日期 |
| description | textarea | — | 备注 |

**mes_inventory（线边库存）** — 8 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| name | text | — | 库存记录名称 |
| **material** | **lookup** | **mes_materials** | ⭐ 关联物料 |
| quantity | number | — | 当前数量 |
| unit | select | — | 单位 |
| location | text | — | 库位 |
| min_qty | number | — | 最低库存 |
| max_qty | number | — | 最高库存 |
| description | textarea | — | 备注 |

U8 同步字段：uf_inv_code（CurrentStock.cInvCode）

---

### 质量管控域

**mes_inspection_records（检验记录）** — 11 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| inspection_number | autonumber | — | 检验编号 QC-{YYYY}{MM}{DD}-{0000}，is_name |
| inspection_type | select | — | 来料检验/过程检验/完工检验 |
| **work_order** | **lookup** | **mes_work_orders** | 关联工单 |
| **equipment** | **lookup** | **mes_equipment** | 设备 |
| inspector | lookup | users | 检验员 |
| inspection_date | datetime | — | 检验日期 |
| result | select | — | 合格/不合格/让步接收 |
| total_qty | number | — | 检验数量 |
| defect_qty | number | — | 缺陷数量 |
| description | textarea | — | 检验说明 |

**mes_defects（缺陷登记）** — 9 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| defect_number | autonumber | — | 缺陷编号 DF-{0000}，is_name |
| name | text | — | 缺陷名称 |
| **inspection** | **lookup** | **mes_inspection_records** | 关联检验 |
| **work_order** | **lookup** | **mes_work_orders** | 关联工单 |
| defect_type | select | — | 尺寸超差/外观不良/材料缺陷/功能异常/其他 |
| severity | select | — | 轻微/一般/严重/致命 |
| defect_qty | number | — | 缺陷数量 |
| description | textarea | — | 缺陷描述 |
| defect_image | image | — | 缺陷图片 |

**mes_nonconformance（不合格处理）** — 10 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| nc_number | autonumber | — | 处理编号 NC-{0000}，is_name |
| name | text | — | 处理单名称 |
| **defect** | **lookup** | **mes_defects** | ⭐ 关联缺陷 |
| **work_order** | **lookup** | **mes_work_orders** | 关联工单 |
| status | select | — | 待处理/处理中/已完成/已关闭 |
| disposition | select | — | 让步接收/返工/报废/退货 |
| root_cause | textarea | — | 根本原因 |
| handler | lookup | users | 处理人 |
| handling_date | datetime | — | 处理日期 |
| description | textarea | — | 备注 |

---

### 设备管理域

**mes_equipment（设备台账）** — 10 个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| equipment_code | autonumber | 设备编号 EQ-{0000}，is_name |
| name | text | 设备名称 |
| model | text | 规格型号 |
| location | text | 所在位置 |
| status | select | 正常运行/停机/维修中/报废 |
| purchase_date | date | 购入日期 |
| last_maintenance_date | date | 上次维保日期 |
| maintenance_cycle | number | 维保周期（天） |
| responsible | lookup | users：负责人 |
| description | textarea | 备注 |

**mes_maintenance_records（维保记录）** — 11 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| maintenance_number | autonumber | — | 维保编号，is_name |
| name | text | — | 维保名称 |
| **equipment** | **lookup** | **mes_equipment** | ⭐ 关联设备 |
| maintenance_type | select | — | 日常保养/定期检修/故障维修/大修 |
| status | select | — | 计划中/执行中/已完成 |
| planned_date | date | — | 计划日期 |
| actual_date | date | — | 实际日期 |
| handler | lookup | users | 维保人员 |
| cost | number | — | 费用 |
| description | textarea | — | 备注 |

**mes_equipment_faults（故障报修）** — 11 个字段

| 字段名 | 类型 | 关联对象 | 说明 |
|--------|------|---------|------|
| fault_number | autonumber | — | 故障编号，is_name |
| name | text | — | 故障名称 |
| **equipment** | **lookup** | **mes_equipment** | ⭐ 关联设备 |
| fault_type | select | — | 机械故障/电气故障/软件故障/操作失误/其他 |
| severity | select | — | 轻微/一般/严重/紧急 |
| status | select | — | 待报修/已报修/处理中/已解决 |
| reporter | lookup | users | 报修人 |
| report_date | datetime | — | 报修时间 |
| handler | lookup | users | 处理人 |
| repair_date | datetime | — | 修复时间 |
| description | textarea | — | 故障描述 |

---

## 三、关联类型的业务含义

### master_detail（主子明细）

| 主对象 | 子对象 | 业务含义 |
|--------|--------|---------|
| mes_work_orders | mes_production_reports | 一个工单有多条报工记录。删除工单时级联删除所有报工。 |
| mes_routings | mes_operations | 一条工艺路线包含多道工序。删除路线时级联删除所有工序。 |

### lookup（引用）

| 源对象 | 引用对象 | 数量 | 业务含义 |
|--------|---------|------|---------|
| mes_work_orders | mes_routings | 1:1 | 一个工单选用一条工艺路线 |
| mes_work_orders | mes_equipment | 1:1 | 一个工单指定一台设备 |
| mes_production_reports | mes_operations | 1:1 | 报工对应一道工序 |
| mes_production_reports | mes_equipment | 1:1 | 报工使用一台设备 |
| mes_tasks | mes_work_orders | N:1 | 一个工单可拆分多个工人任务 |
| mes_tasks | mes_operations | 1:1 | 任务对应一道工序 |
| mes_tasks | mes_workshops | 1:1 | 任务在某个车间执行 |
| mes_tasks | mes_equipment | 1:1 | 任务使用一台设备 |
| mes_routings | mes_materials | 1:1 | 工艺路线针对一个产品 |
| mes_operations | mes_work_centers | 1:1 | 工序在一个工作中心执行 |
| mes_work_centers | mes_workshops | N:1 | 一个车间有多个工作中心 |
| mes_bom_items | mes_materials (product) | N:1 | BOM 父件 |
| mes_bom_items | mes_materials (component) | N:1 | BOM 子件（一个物料可以是多个 BOM 的子件） |
| mes_inventory | mes_materials | 1:1 | 库存对应一个物料 |
| mes_inspection_records | mes_work_orders | 1:1 | 检验针对一个工单 |
| mes_inspection_records | mes_equipment | 1:1 | 检验使用一台设备 |
| mes_defects | mes_inspection_records | 1:1 | 缺陷属于一次检验 |
| mes_defects | mes_work_orders | 1:1 | 缺陷关联到一个工单 |
| mes_nonconformance | mes_defects | 1:1 | 不合格处理针对一个缺陷 |
| mes_nonconformance | mes_work_orders | 1:1 | 不合格处理关联到一个工单 |
| mes_maintenance_records | mes_equipment | N:1 | 一台设备有多次维保记录 |
| mes_equipment_faults | mes_equipment | N:1 | 一台设备有多次故障记录 |

---

## 四、跨表业务流

### 主生产流程

```
物料主数据 (mes_materials)
      │
      ├──→ 工艺路线 (mes_routings)       ← product 指定加工对象
      │         │
      │         └──→ 工序定义 (mes_operations) ← routing 明细
      │                │
      │                └──→ 工作中心 (mes_work_centers) ← work_center
      │                       │
      │                       └──→ 车间 (mes_workshops) ← workshop
      │
      ├──→ BOM 清单 (mes_bom_items)      ← product/component 物料构成
      │
      └──→ 线边库存 (mes_inventory)       ← material 库存量
              │
              ↓
       生产工单 (mes_work_orders)
         │    ├── routing → mes_routings    ← 指定工艺路线
         │    ├── equipment → mes_equipment ← 指定设备
         │    └── 可拆分为多个工人任务 (mes_tasks)
         │
         ├──→ 报工记录 (mes_production_reports) ← work_order (master_detail)
         │        ├── operation → mes_operations  ← 指定工序
         │        └── equipment → mes_equipment   ← 使用设备
         │
         └──→ 工人任务 (mes_tasks) ← work_order
                  ├── operation → mes_operations
                  ├── workshop → mes_workshops
                  └── equipment → mes_equipment
```

### 质量追溯链路

```
生产工单 (mes_work_orders)
      │
      └──→ 检验记录 (mes_inspection_records) ← work_order
              │
              └──→ 缺陷登记 (mes_defects) ← inspection
                      │
                      ├──→ 不合格处理 (mes_nonconformance) ← defect
                      │
                      └── (关联回 work_order)
```

### 设备追溯链路

```
设备台账 (mes_equipment)
      │
      ├──→ 维保记录 (mes_maintenance_records) ← equipment
      │
      ├──→ 故障报修 (mes_equipment_faults) ← equipment
      │
      ├──→ 工单 (mes_work_orders) ← equipment
      │
      ├──→ 报工记录 (mes_production_reports) ← equipment
      │
      └──→ 工人任务 (mes_tasks) ← equipment
```

### 车间组织链路

```
车间 (mes_workshops)
      │
      ├──→ 工作中心 (mes_work_centers) ← workshop
      │
      └──→ 工人任务 (mes_tasks) ← workshop
```

---

## 五、对象清单总表

| 对象 API 名 | 中文名 | 字段数 | 权限角色数 | 列表视图数 | 主从关系 |
|-------------|--------|:-----:|:---------:|:---------:|---------|
| mes_work_orders | 生产工单 | 15 | 5 | 3 | 主→报工 |
| mes_production_reports | 报工记录 | 12 | 5 | 2 | 从→工单 |
| mes_tasks | 工人任务 | 14 | 5 | 3 | 独立 |
| mes_routings | 工艺路线 | 8 | 5 | 1 | 主→工序 |
| mes_operations | 工序定义 | 9 | 5 | 1 | 从→路线 |
| mes_work_centers | 工作中心 | 4 | 5 | 1 | 独立 |
| mes_workshops | 车间管理 | 4 | 5 | 1 | 独立 |
| mes_bom_items | BOM 清单 | 10 | 5 | 1 | 独立 |
| mes_equipment | 设备台账 | 10 | 5 | 2 | 独立 |
| mes_maintenance_records | 维保记录 | 11 | 5 | 2 | 独立 |
| mes_equipment_faults | 故障报修 | 11 | 5 | 2 | 独立 |
| mes_inspection_records | 检验记录 | 11 | 5 | 3 | 独立 |
| mes_defects | 缺陷登记 | 9 | 5 | 2 | 独立 |
| mes_nonconformance | 不合格处理 | 10 | 5 | 2 | 独立 |
| mes_materials | 物料主数据 | 8 | 5 | 3 | 独立 |
| mes_inventory | 线边库存 | 8 | 5 | 2 | 独立 |

---

## 六、U8 同步字段总表

| MES 对象 | U8 表 | U8 字段 | MES 字段 | 用途 |
|---------|-------|---------|---------|------|
| mes_work_orders | mom_order | MoId | uf_mo_id | 同步关联键 |
| mes_work_orders | mom_orderdetail | SoCode | uf_so_code | 销售订单追溯 |
| mes_production_reports | sfc_optransform | TransformId | uf_transform_id | 同步关联键 |
| mes_routings | sfc_prouting | PRoutingId | uf_prouting_id | 同步关联键 |
| mes_operations | sfc_operation | OperationId | uf_operation_id | 同步关联键 |
| mes_work_centers | sfc_workcenter | WcId | uf_wc_id | 同步关联键 |
| mes_materials | Inventory | cInvCode | uf_inv_code | 同步关联键 |
| mes_inventory | CurrentStock | cInvCode | uf_inv_code | 库存关联 |
| mes_bom_items | bom_bom+bom_opcomponent | — | uf_bom_key | 同步关联键 |

---

## 七、发现的问题

| # | 问题 | 涉及对象 | 说明 |
|---|------|---------|------|
| 1 | **报工记录缺少与物料的关系** | mes_production_reports | 报工时消耗的物料应在报工记录中有引用字段，但目前没有。无法追溯"这批货用了哪些料"。 |
| 2 | **检验记录未关联到具体的报工** | mes_inspection_records | 检验应该可以关联到具体的报工批次，但目前只关联了工单。无法按批次追溯质量。 |
| 3 | **设备状态不同步** | mes_equipment | 设备状态是手动维护的 select 字段，不会因有维保/故障/工单自动变更。 |
| 4 | **工单未关联物料** | mes_work_orders | 工单没有 `product` 字段指定生产什么物料。虽然可以通过 routing → product 间接找到，但直接字段更方便查询。 |
| 5 | **BOM 未关联工序** | mes_bom_items | BOM 的 op_seq 是纯数字，没有直接关联到 mes_operations 的工序记录。 |
| 6 | **工作中心过于独立** | mes_work_centers | 工作中心只是一个独立的 lookup 目标，未与其他业务逻辑关联（如产能计算、排程）。 |
