# FileBrowser Tree Enhancer

> 为 [File Browser](https://github.com/filebrowser/filebrowser) 添加 Octotree 风格侧边目录树的 Tampermonkey 油猴脚本。

![Version](https://img.shields.io/badge/version-0.5-blue)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey-green)
![File Browser](https://img.shields.io/badge/File_Browser-compatible-brightgreen)

---

## ✨ 功能一览

| 功能 | 说明 |
|------|------|
| 🌳 目录树 | 左侧 Octotree 风格树形目录，通过 File Browser API（`/api/resources`）懒加载 |
| ↔️ 分屏布局 | 固定模式下侧栏常驻，右侧内容自动缩进（`margin-left` + `width`），不遮挡原页面 |
| 📌 固定/取消固定 | 固定（`📌`）= 侧栏常驻分屏；取消固定（`📍`）= 浮动覆盖层，鼠标移入时显示 |
| 🔽 收起/展开 | 侧栏可折叠为仅显示一个箭头按钮的极窄条（46px），单击恢复 |
| 🎨 深色 / 浅色主题 | 一键切换，自动跟随系统偏好（`prefers-color-scheme`），保存在 `localStorage` |
| 💾 状态持久化 | 展开的文件夹路径、主题偏好、固定/折叠状态均写入 `localStorage`，刷新不丢失 |
| 🔐 登录态支持 | 自动读取 File Browser 的 JWT（`localStorage` 中的 `jwt` 字段），附带 `X-Auth` 请求头 |
| 🇨🇳 中文排序 | 目录按 `zh-CN` locale 排序 |
| 🎯 当前路径高亮 | 自动展开当前目录的所有父级，并将当前行高亮显示，滚动至可视区域 |

---

## 📦 安装

### 前提条件

- 浏览器已安装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Firefox / Edge 均可）
- 已部署并可访问的 [File Browser](https://github.com/filebrowser/filebrowser) 实例

### 安装步骤

1. 点击浏览器工具栏的 Tampermonkey 图标 → **添加新脚本**（或直接访问 `tampermonkey.net`）
2. 删除编辑器中的默认内容
3. 将本仓库 `enhancer.js` 的**全部内容**粘贴进去
4. 按 `Ctrl + S` 保存

### 修改匹配地址

脚本默认匹配 `http://192.168.3.138:8080/*`，请根据你的 File Browser 实际地址修改文件头部的 `@match` 行：

```javascript
// @match        http://192.168.3.138:8080/*
```

例如你的 File Browser 运行在 `http://10.0.0.5:80`，则改为：

```javascript
// @match        http://10.0.0.5:80/*
```

> ⚠️ 如果使用了 HTTPS 或非默认端口，也请同步修改。多个地址可用多个 `@match` 行。

---

## 🖱 使用方法

安装后刷新 File Browser 页面，左侧会自动出现目录树面板：

```
┌─────────────────────────────────────────────────────┐
│ 📁 文件目录     ☀ 📌 ◀      │  File Browser 主界面  │
│──────────────────────────────────────│  (自动缩进)    │
│ ▼ 📁 根目录                          │                │
│   ▼ 📁 Documents                     │                │
│     📁 项目A                         │                │
│     📁 项目B                         │                │
│   ▶ 📁 Pictures                      │                │
│   ▶ 📁 Videos                        │                │
│                                       │                │
└──────────────────────────────────────┘────────────────┘
```

### 按钮说明

| 按钮 | 位置 | 功能 |
|------|------|------|
| `☀` / `☾` | 顶栏 | 切换深色/浅色主题 |
| `📌` / `📍` | 顶栏 | 固定/取消固定侧栏 |
| `◀` / `▶` | 顶栏 | 收起/展开侧栏 |
| `▶` / `▼` | 每行左侧 | 展开/折叠该目录的子文件夹 |

- **点击文件夹名称**：跳转到该目录（在 File Browser 主界面打开）
- **点击箭头 `▶`**：仅展开/折叠子目录，不跳转

---

## ⚙️ 技术细节

### 目录加载

脚本通过 File Browser 的 REST API 获取子目录列表：

```
GET /api/resources/<path>?raw=true
```

- 请求头自动附加 `X-Auth: <JWT>`（从 `localStorage.jwt` 读取）
- 仅返回 `isDir === true` 或 `type === 'directory'` 的条目
- 结果按文件夹名称 `zh-CN` locale 排序

### 状态存储（`localStorage`）

| Key | 值 | 说明 |
|-----|-----|------|
| `fbte-theme` | `"dark"` \| `"light"` | 当前主题 |
| `fbte-expanded-folders` | `["/", "/Documents", ...]` | 已展开的目录路径列表 |
| `fbte-sidebar-collapsed` | `"true"` \| `"false"` | 侧栏是否收起 |
| `fbte-sidebar-pinned` | `"true"` \| `"false"` | 侧栏是否固定 |
| `jwt` | `"<token>"` | File Browser 登录态（原生 key，非本脚本创建） |

### 侧栏宽度

| 模式 | 宽度 |
|------|------|
| 展开（正常） | 280px |
| 收起 | 46px |

### 配置常量（代码顶部可修改）

```javascript
const NORMAL_WIDTH    = 280;   // 展开时宽度（px）
const COLLAPSED_WIDTH = 46;    // 收起时宽度（px）
```

---

## 🔧 故障排查

| 问题 | 解决方案 |
|------|---------|
| 目录树不显示 | 确认 Tampermonkey 已启用脚本；刷新页面；检查浏览器控制台（`F12`）是否有 `[FBTE]` 相关报错 |
| 目录显示"读取失败" | File Browser 未登录或 JWT 已过期，重新登录后刷新 |
| 目录树不随页面变化 | 脚本在 `document-idle` 时初始化，若 File Browser SPA 路由切换后目录树未更新，刷新页面即可 |
| 侧栏遮挡内容 | 确认处于固定模式（`📌` 状态），浮动模式下侧栏会覆盖在内容上方 |

---

## 📁 项目结构

```
FileBrowser_tree_Enhancer/
├── enhancer.js      # 油猴脚本主文件
└── README.md
```

---

## 📄 License

MIT
