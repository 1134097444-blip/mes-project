# U8 ERP 数据库完整结构

> 数据库：UFDATA_006_2025（用友 U8）
> 服务器：192.168.1.21
> 2026-05-21 更新（完整版 v2.0）

---

## 零、数据库总览

| 指标 | 数值 |
|------|------|
| 总表数 | 5,866 |
| 业务相关表 | 369 |
| 视图数 | ~200+ |
| 数据年份 | 2025 年度 |

---

## 一、生产订单（Production Order）

### mom_order — 生产订单主表（2,804 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| MoId | int (PK) | 生产订单 ID |
| MoCode | nvarchar(30) | 生产订单号（如 J250500258） |
| CreateDate | datetime | 创建日期 |
| CreateUser | nvarchar(20) | 创建人 |
| ModifyDate | datetime | 修改日期 |
| ModifyUser | nvarchar(20) | 修改人 |
| VTid | int | 单据模板 |
| CreateTime | datetime | 创建时间 |
| Define1~Define16 | various | 自定义字段 |

MES 映射 → `mes_work_orders`
- `mom_order.MoCode` → `order_number`
- `mom_order.CreateDate` → `planned_start_date`

### mom_orderdetail — 生产订单物料明细（53,524 行，118 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| MoDId | int (PK) | 明细 ID |
| MoId | int (FK→mom_order) | 生产订单 ID |
| SortSeq | int | 排序号 |
| InvCode | nvarchar(60) | ⭐ 物料编码（FK→Inventory） |
| Qty | decimal | 数量 |
| MrpQty | decimal | MRP 数量 |
| MoLotCode | nvarchar(60) | 批次 |
| WhCode | nvarchar(10) | 仓库编码 |
| MDeptCode | nvarchar(12) | 生产部门 |
| SoType | tinyint | 来源类型 |
| SoDId | nvarchar(30) | 来源单据 ID |
| SoCode | nvarchar(30) | ⭐ 销售订单号 |
| Status | tinyint | 状态 |
| BomId | int | BOM ID |
| RoutingId | int | 工艺路线 ID |
| DeclaredQty | decimal | 申报数量 |
| QualifiedInQty | decimal | 合格入库数量 |

MES 映射 → `mes_work_orders`
- `mom_order.MoId` → `uf_mo_id`（同步关联键）
- `mom_orderdetail.InvCode` → 可追溯物料（暂存为 uf_inv_code）
- `mom_orderdetail.Qty` → `planned_qty`
- `mom_orderdetail.SoCode` → `uf_so_code`（销售订单追溯）

---

## 二、销售订单（Sales Order）

### SO_SOMain — 销售订单主表（616 行，101 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cSTCode | nvarchar(2) | 单据类型 |
| dDate | datetime | 单据日期 |
| cSOCode | nvarchar(30) | ⭐ 销售订单号 |
| cCusCode | nvarchar(20) | ⭐ 客户编码（FK→Customer） |
| cDepCode | nvarchar(12) | 部门编码（FK→Department） |
| cPersonCode | nvarchar(20) | 业务员（FK→Person） |
| iMoney | money | 订单金额 |
| iStatus | tinyint | 审核状态 |
| cMaker | nvarchar(20) | 制单人 |
| cVerifier | nvarchar(20) | 审核人 |
| cCloser | nvarchar(20) | 关闭人 |

### SO_SODetails — 销售订单明细（16,042 行，137 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| AutoID | int (PK) | 自动 ID |
| cSOCode | nvarchar(30) | ⭐ 销售订单号 |
| cInvCode | nvarchar(60) | ⭐ 物料编码 |
| dPreDate | datetime | 预发货日期 |
| iQuantity | decimal | 数量 |
| iNum | decimal | 件数 |
| iUnitPrice | decimal | 单价 |
| iMoney | money | 金额 |
| iFHNum | decimal | 已发货数量 |
| iFHQuantity | decimal | 已发货件数 |
| iKPQuantity | decimal | 已开票数量 |
| cMemo | nvarchar(255) | 备注 |

**产销串联链路**：`SO_SOMain → SO_SODetails → mom_orderdetail → mom_order`

---

## 三、采购订单（Purchase Order）

### PO_POMain — 采购订单主表（6,473 行，79 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cPOID | nvarchar(30) | 采购订单号 |
| dPODate | datetime | 订单日期 |
| cVenCode | nvarchar(20) | ⭐ 供应商编码（FK→Vendor） |
| cDepCode | nvarchar(12) | 部门 |
| cPersonCode | nvarchar(20) | 采购员 |
| iCost | money | 采购金额 |
| iBargain | money | 议价金额 |
| cMemo | nvarchar(255) | 备注 |

### PO_PODetails — 采购订单明细

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cInvCode | nvarchar(60) | 物料编码 |
| iQuantity | decimal | 数量 |
| iUnitPrice | decimal | 单价 |
| iMoney | money | 金额 |
| dArriveDate | datetime | 到货日期 |
| iArriveQty | decimal | 累计到货数量 |

---

## 四、工艺路线（Routing）

### sfc_prouting — 工艺路线主表（193,499 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| PRoutingId | int (PK) | 工艺路线 ID |
| IdentCode | varchar | 工艺路线编码 |
| IdentDesc | varchar | 工艺路线描述（名称） |
| Version | int | 版本号 |
| Status | int | 状态（3=已发布） |
| VersionEffDate | datetime | 版本生效日期 |

### sfc_proutingdetail — 工艺路线工序明细（595,862 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| PRoutingId | int (FK) | 工艺路线 ID |
| OpSeq | int | 工序序号 |
| OperationId | int (FK) | 工序 ID |
| WcId | int (FK) | 工作中心 ID |
| SubFlag | tinyint | 委外标志 |
| NextOpSeq | int | 下一道工序 |
| TimeCycle | decimal | 工时定额（分钟） |

### sfc_proutingpart — 工艺路线物料清单

| 字段名 | 类型 | 说明 |
|--------|------|------|
| PRoutingId | int | 工艺路线 ID |
| InvCode | varchar | 物料编码 |
| Qty | decimal | 用量 |

---

## 五、生产执行（Production Execution）

### sfc_morouting — 生产订单工艺路线（〜53,000+）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| MoRoutingId | int (PK) | 主表 ID |
| MoId | int (FK→mom_order) | 生产订单 ID |
| PRoutingId | int | 来源工艺路线 ID |
| Status | int | 状态 |

### sfc_moroutingdetail — 生产订单工艺路线明细

| 字段名 | 类型 | 说明 |
|--------|------|------|
| MoRoutingDId | int (PK) | 明细 ID |
| MoRoutingId | int (FK) | 主表 ID |
| MoId | int (FK) | 生产订单 ID |
| OperationId | int (FK) | 工序 ID |
| OpSeq | int | 工序序号 |
| WcId | int (FK) | 工作中心 ID |
| PlanStartDate | datetime | 计划开工 |
| PlanEndDate | datetime | 计划完工 |
| PlanQualifiedQty | decimal | 计划合格数量 |

### sfc_optransform — 工序流转/报工（〜11,000+）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| TransformId | int (PK) | 流转记录 ID |
| MoRoutingDId | int (FK) | 工艺路线明细 ID |
| OpStatus | int | 工序状态（>=1=已报工） |
| QualifiedQty | decimal | 合格数量 |
| ScrapQty | decimal | 报废数量 |
| RefusedQty | decimal | 拒收数量 |
| ReworkQty | decimal | 返工数量 |
| DocDate | datetime | 单据日期 |
| DocCode | varchar | 单据编号 |
| ReceiveWcId | int | 接收工作中心 |
| ReceiveUserId | int | 接收人 |

---

## 六、物料与 BOM

### Inventory — 物料档案（239,541 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cInvCode | nvarchar(60) (PK) | ⭐ 存货编码 |
| cInvName | nvarchar(60) | 存货名称 |
| cInvStd | nvarchar(60) | 规格型号 |
| cInvCCode | nvarchar(12) | 存货分类编码 |
| cComUnitCode | nvarchar(10) | 计量单位 |
| iInvNCost | decimal | 最新成本 |
| bInvEntrust | tinyint | 是否委外 |

### bom_bom — BOM 主表（192,063 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| BomId | int (PK) | BOM ID |
| ParentInvCode | nvarchar(60) | ⭐ 父件物料编码 |
| Version | int | 版本 |
| EffDate | datetime | 生效日期 |

### bom_opcomponent — BOM 子件（731,923 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| BomId | int (FK→bom_bom) | BOM ID |
| InvCode | nvarchar(60) | ⭐ 子件物料编码 |
| Qty | decimal | 用量 |
| OpSeq | int | 使用工序 |

### bom_parent — 父件索引（192,063 行）

### bom_quepart — 配额物料（21,303 行）

---

## 七、工序与工作中心

### sfc_operation — 工序定义（〜85 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| OperationId | int (PK) | 工序 ID |
| OpCode | varchar(12) | 工序编码 |
| Description | varchar | 工序描述 |
| WcId | int | 默认工作中心 |
| OpType | varchar | 工序类型 |

### sfc_workcenter — 工作中心（〜84 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| WcId | int (PK) | 工作中心 ID |
| WcCode | varchar(12) | 编码 |
| WcName | varchar | 名称 |
| DeptCode | varchar | 所属部门 |

---

## 八、库存

### CurrentStock — 现存量（49,392 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cInvCode | nvarchar(60) | ⭐ 存货编码 |
| iQuantity | decimal | 现存量 |
| cWhCode | nvarchar(10) | 仓库编码 |
| iLowQty | decimal | 最低库存 |
| iHighQty | decimal | 最高库存 |

### RdRecord — 收发存主表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| ID | int (PK) | 主表 ID |
| bRdFlag | bit | 收发标志（0=入库，1=出库） |
| cVouchType | nvarchar(10) | 单据类型 |
| cBusType | nvarchar(10) | 业务类型 |
| cSource | nvarchar(30) | 来源 |
| cCode | nvarchar(30) | 单据号 |
| dDate | datetime | 日期 |
| cWhCode | nvarchar(10) | 仓库 |
| cDepCode | nvarchar(12) | 部门 |
| cPersonCode | nvarchar(20) | 业务员 |
| cHandler | nvarchar(20) | 保管人 |
| cMaker | nvarchar(20) | 制单人 |
| cMemo | nvarchar(255) | 备注 |

### RdRecords — 收发存明细

| 字段名 | 类型 | 说明 |
|--------|------|------|
| AutoID | int (PK) | 明细 ID |
| ID | int (FK) | 主表 ID |
| cInvCode | nvarchar(60) | ⭐ 物料编码 |
| iQuantity | decimal | 数量 |
| iUnitCost | money | 单价 |
| iPrice | money | 金额 |
| cBatch | nvarchar(20) | 批次 |
| dVDate | datetime | 有效期 |
| cWhCode | nvarchar(10) | 仓库 |

---

## 九、基础数据

### Department — 部门（31 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cDepCode | nvarchar(12) (PK) | 部门编码 |
| cDepName | nvarchar(255) | 部门名称 |
| cDepPerson | nvarchar(20) | 部门负责人 |
| cDepPhone | nvarchar(100) | 电话 |
| cDepAddress | nvarchar(255) | 地址 |
| bShop | bit | 是否门店 |
| cDepType | nvarchar(20) | 部门类型 |

### Person — 人员（352 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cPersonCode | nvarchar(20) (PK) | 人员编码 |
| cPersonName | nvarchar(40) | 人员姓名 |
| cDepCode | nvarchar(12) (FK) | 所属部门 |
| cPersonPhone | nvarchar(100) | 电话 |

### Customer — 客户（179 行，167 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cCusCode | nvarchar(20) (PK) | 客户编码 |
| cCusName | nvarchar(98) | 客户名称 |
| cCusAbbName | nvarchar(60) | 客户简称 |
| cCCCode | nvarchar(12) | 客户分类 |
| cCusAddress | nvarchar(255) | 地址 |
| cCusPhone | nvarchar(100) | 电话 |
| cCusPerson | nvarchar(50) | 联系人 |

### Vendor — 供应商（2,691 行，124 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cVenCode | nvarchar(20) (PK) | 供应商编码 |
| cVenName | nvarchar(98) | 供应商名称 |
| cVenAbbName | nvarchar(60) | 供应商简称 |
| cVCCode | nvarchar(12) | 供应商分类 |
| cVenAddress | nvarchar(255) | 地址 |

### Warehouse — 仓库

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cWhCode | nvarchar(10) (PK) | 仓库编码 |
| cWhName | nvarchar(20) | 仓库名称 |
| cDepCode | nvarchar(12) | 部门编码 |
| bShop | bit | 是否门店 |

---

## 十、财务（Finance）

### GL_accvouch — 凭证（37,154 行，151 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| i_id | int (PK) | 凭证 ID |
| iperiod | tinyint | 会计期间 |
| csign | nvarchar(8) | 凭证字 |
| ino_id | int | 凭证号 |
| idate | datetime | 凭证日期 |
| cdgwcode | nvarchar(14) | ⭐ 科目编码（FK→Code） |
| md | money | 借方金额 |
| mc | money | 贷方金额 |
| ccode | nvarchar(40) | 科目 |
| ccode_equal | nvarchar(40) | 对方科目 |
| cd_dept | nvarchar(12) | 部门 |
| cd_person | nvarchar(20) | 个人 |
| cd_cus | nvarchar(20) | 客户 |
| cd_sup | nvarchar(20) | 供应商 |
| cd_item | nvarchar(20) | 项目 |
| cd_inv | nvarchar(60) | 存货 |
| cdigest | nvarchar(120) | 摘要 |
| csource | nvarchar(30) | 来源 |

### Code — 科目表（932 行，62 列）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cclass | nvarchar(14) | 科目类别 |
| ccode | nvarchar(40) | ⭐ 科目编码 |
| ccode_name | nvarchar(100) | 科目名称 |
| igrade | tinyint | 科目级次 |
| bproperty | bit | 方向（0=借方，1=贷方） |
| cbook_type | nvarchar(10) | 账簿类型 |
| chelp | nvarchar(6) | 辅助核算 |
| bperson | bit | 是否个人核算 |
| bcus | bit | 是否客户核算 |
| bsup | bit | 是否供应商核算 |
| bdept | bit | 是否部门核算 |

---

## 十一、收发存

### DispatchList — 发货单主表（2,107 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| DLID | int (PK) | 发货单 ID |
| cDLCode | nvarchar(30) | 发货单号 |
| dDate | datetime | 日期 |
| cCusCode | nvarchar(20) | 客户 |
| cWhCode | nvarchar(10) | 仓库 |
| cDepCode | nvarchar(12) | 部门 |
| cPersonCode | nvarchar(20) | 业务员 |
| cMaker | nvarchar(20) | 制单人 |
| cVerifier | nvarchar(20) | 审核人 |

### DispatchLists — 发货单明细（11,520 行）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cInvCode | nvarchar(60) | 物料编码 |
| iQuantity | decimal | 发货数量 |
| iUnitPrice | money | 单价 |
| iMoney | money | 金额 |
| cBatch | nvarchar(20) | 批次 |

---

## 十二、完整数据流

```
客户 (Customer) ──→ 销售订单 (SO_SOMain + SO_SODetails)
                              │
                              ↓ cSOCode → mom_orderdetail.SoCode
                        生产订单 (mom_order + mom_orderdetail)
                              │
                   ┌──────────┼──────────┐
                   │          │          │
                   ↓          ↓          ↓
           sfc_morouting  Inventory   bom_bom
                   │      (物料主数据)    │
                   ↓                    ↓
        sfc_moroutingdetail          bom_opcomponent
                   │              (BOM 子件)
                   ↓
          sfc_optransform
          (工序报工/流转)
```

## 十三、U8 → MES 同步索引

| U8 表 | 行数 | MES 对象 | 同步键 | 状态 |
|-------|:----:|---------|--------|:----:|
| sfc_workcenter | ~84 | mes_work_centers | uf_wc_id | ✅ |
| sfc_operation | ~85 | mes_operations | uf_operation_id | ✅ |
| sfc_prouting | 193,499 | mes_routings | uf_prouting_id | ✅ |
| Inventory | 239,541 | mes_materials | uf_inv_code | ✅ |
| CurrentStock | 49,392 | mes_inventory | uf_inv_code+location | ✅ |
| mom_order | 53,038 | mes_work_orders | uf_mo_id | ✅ |
| sfc_optransform | ~11,000 | mes_production_reports | uf_transform_id | ✅ |
| bom_bom + bom_opcomponent | 731,923 | mes_bom_items | uf_bom_key | 🆕 脚本就绪 |
| SO_SOMain + SO_SODetails | 616/16K | — | — | ❌ |
| PO_POMain + PO_PODetails | 6,473 | — | — | ❌ |
| RdRecord + RdRecords | — | — | — | ❌ |
| GL_accvouch | 37,154 | — | — | ❌ |
| Department | 31 | — | — | ❌ |
| Person | 352 | — | — | ❌ |
| Customer | 179 | — | — | ❌ |
| Vendor | 2,691 | — | — | ❌ |
