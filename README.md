# MES —— AI 自动化编程实践项目（制造执行系统）

[![Steedos](https://img.shields.io/badge/Steedos-3.0.14-blue)](https://www.steedos.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![Node](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> **本项目是一个 AI 自动化编程的示范项目。** 从系统设计、数据建模、权限配置、页面搭建到业务逻辑，**全部由 AI Agent（DeepSeek 等）自动生成和维护**，人工只负责需求描述和最终验收。

## 什么是 AI 自动化编程？

传统软件开发需要工程师手写每一行代码；本项目证明，通过结构化的 AI 提示词和现代化的前后端分离架构，可以让 AI Agent 完整承担：

- **需求分析** → AI 根据业务描述生成设计文档
- **数据建模** → AI 生成对象、字段、关系的 YAML 元数据
- **权限配置** → AI 为每个角色生成增删改查权限
- **前端搭建** → AI 用 React + Vite + Tailwind 搭建科技风仪表盘、列表、设备面板
- **业务逻辑** → AI 编写触发器、函数等服务端代码
- **测试验证** → AI 通过 MCP 自动化前端测试并截图验证

人工只需要：**用中文描述需求 → 审核 AI 的输出 → 给出反馈**。

## 技术栈

- **数据引擎**：Steedos（元数据驱动 + REST API）
- **后端**：Node.js、TypeScript/JavaScript、Moleculer 服务
- **前端**：React + Vite + Tailwind CSS（独立开发）
- **元数据**：YAML
- **数据库**：MongoDB
- **测试**：Playwright + MCP 服务器

## 项目目标

用 AI 自动化编程构建一套可维护的 MES（制造执行系统），覆盖生产排程、工单执行、质量追溯、设备维保、物料流转全链路，验证「人工写需求、AI 写代码」这一开发模式在离散制造业务场景中的可行性。

## 架构

```
前端 (5173)                      后端 (5100)
React + Vite + Tailwind  ──API──→  Steedos 元数据引擎
  Dashboard.jsx                   objects/*.object.yml
  WorkOrders.jsx                  fields/*.field.yml
  Equipment.jsx                   permissions/*.permission.yml
                                  triggers / functions
```

- **5100 端口**：Steedos 纯数据引擎，只负责元数据、API、后端逻辑
- **5173 端口**：React 前端，所有 UI 交互在这里

## 目录结构

```
mes-project/
├── package.json
├── steedos-config.yml
├── CLAUDE.md                     # DeepSeek 项目指令（主控文件）
├── steedos-packages/mes/         # Steedos 后端包（元数据层）
│   └── main/default/
│       ├── objects/              # 16 个 MES 业务对象
│       ├── triggers/             # 触发器
│       ├── functions/            # 函数
│       ├── permissionsets/       # 权限集
│       └── ...
├── frontend/                     # ★ React 前端（主力 UI）
│   ├── mcp-server.js             # MCP 前端测试服务器
│   └── web/
│       ├── vite.config.js        # Vite 配置 + API 代理
│       └── src/
│           ├── App.jsx           # 主布局（侧边栏导航）
│           ├── api.js            # Steedos API 接口层
│           ├── index.css         # 科技风暗色主题
│           └── pages/
│               ├── Dashboard.jsx   # 仪表盘
│               ├── WorkOrders.jsx  # 工单列表
│               └── Equipment.jsx   # 设备监控
├── docs/                         # 项目文档
└── tests/                        # 测试脚本
    └── emergency_recovery.js     # 数据库急救脚本
```

## 开发约定

- 所有自定义业务对象 API 名必须以 `mes_` 开头
- 前端所有 UI 代码在 `frontend/web/src/` 下，不碰 Steedos Amis 页面
- Steedos 仅用于元数据定义、API、触发器、函数
- 新增对象时：先加 YAML 元数据 → 重启服务 → 前端加 API 调用和页面
- 修改前端后用 MCP 测试工具验证页面正常
- 不要提交密钥或 `.env` 文件

## 常用命令

```bash
# 启动 Steedos 后端
start_server.bat

# 启动前端开发服务器
cd frontend/web && npx vite --host 0.0.0.0 --port 5173

# 数据库急救（系统对象丢失时）
node tests/emergency_recovery.js

# MCP 前端测试
deepseek mcp tools
```

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 3.0.0 | 2026-05-22 | 架构拆分：React 前端 (5173) + Steedos 后端 (5100) | AI |
| 1.0.0 | 2026-05-18 | 初稿 | AI |
