# FileBrowser Tree Enhancer

> 一个 [Tampermonkey](https://www.tampermonkey.net/) 油猴脚本，为 [File Browser](https://github.com/filebrowser/filebrowser) 添加 Octotree 风格的侧边目录树。

![Version](https://img.shields.io/badge/version-0.5-blue)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey-green)

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🌳 **目录树** | 左侧展示 Octotree 风格的文件/文件夹目录树，支持展开/收起 |
| 📌 **固定/取消固定** | 侧边栏可固定为常驻，也可取消固定自动隐藏 |
| ↔️ **分屏浏览** | 侧边栏展开时右侧内容自动缩进，不遮挡原页面 |
| 🎨 **深色 / 浅色主题** | 一键切换，自动保存偏好 |
| 💾 **状态持久化** | 展开的文件夹、主题、固定/折叠状态全部存储在 `localStorage` |

---

## 📦 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击浏览器右上角 Tampermonkey 图标 → **添加新脚本**
3. 将 `enhancer.js` 的全部内容粘贴到编辑器中，保存即可

> 脚本默认匹配地址 `http://192.168.3.138:8080/*`，请根据你的 File Browser 地址修改 `@match` 字段：
> ```javascript
> // @match        http://192.168.3.138:8080/*
> ```

---

## 🖼 截图

> _（欢迎补充截图）_

---

## ⚙️ 配置

脚本启动后，页面左侧会出现一个可交互的目录树面板：

- **📌 按钮**：固定/取消固定侧边栏
- **↔️ 拖拽边缘**：调整目录树宽度
- **🌙 / ☀️ 按钮**：切换深色/浅色主题

---

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `enhancer.js` | 油猴脚本主文件 |

---

## 📄 License

MIT
