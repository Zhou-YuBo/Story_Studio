<div align="center">

# Story Studio

### 面向长篇故事创作者的本地创作工作台

不是替你写故事的 AI 工具，而是帮助创作者组织灵感、人物、结构、场景和创作约束的 Story Operating System。

<br />

<b>灵感</b> · <b>世界</b> · <b>人物</b> · <b>结构</b> · <b>场景</b> · <b>提醒</b> · <b>导出</b>

<br />

<img alt="Vue" src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square" />
<img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848f?style=flat-square" />
<img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square" />
<img alt="MVP" src="https://img.shields.io/badge/Status-MVP%20Closing-f59e0b?style=flat-square" />

</div>

---

## 项目简介

Story Studio 是一个为编剧、小说作者、游戏叙事设计师、动画导演等创作者准备的本地桌面创作工具。

它关注的不是“生成一段文本”，而是帮助创作者把一个故事背后的复杂系统搭起来：灵感碎片、世界规则、人物动力、结构曲线、场景推进、节拍拆分、创作提醒，最终汇入可以持续创作和复盘的工作台。

当前项目处于 MVP 收尾阶段：核心工作台和主要交互已经成型，正在完善项目保存、PDF 导出、开屏与项目大厅等最后几项体验。

---

## 为什么做 Story Studio

很多写作工具把重点放在“文本编辑”或“AI 续写”上，但长篇故事真正困难的部分往往不是打字，而是：

<table>
  <tr>
    <td width="33%"><b>信息太散</b><br />灵感、人物、设定、场景笔记分散在不同文档里，很难形成整体。</td>
    <td width="33%"><b>结构太隐形</b><br />故事节奏、价值变化、人物弧光往往藏在脑子里，修改时很难定位问题。</td>
    <td width="33%"><b>创作太容易跑偏</b><br />写到后期，经常忘记最初设定、人物欲望、主题约束和场景目标。</td>
  </tr>
</table>

Story Studio 希望做的是一个“导演级控制台”：不替创作者判断故事好坏，而是把故事系统可视化、可编辑、可追踪。

---

## 核心工作台

<table>
  <tr>
    <th width="16%">工作台</th>
    <th width="28%">定位</th>
    <th>当前能力</th>
  </tr>
  <tr>
    <td><b>灵感</b></td>
    <td>创作输入层</td>
    <td>用自由画布收集文本、图片、PDF、音频等灵感素材，并通过卡片、连线和手绘标记组织关系。</td>
  </tr>
  <tr>
    <td><b>世界</b></td>
    <td>外围规则层</td>
    <td>用对象、分类、颜色和画布关系整理世界观、阵营、规则、地点、道具等设定。</td>
  </tr>
  <tr>
    <td><b>人物</b></td>
    <td>故事动力系统</td>
    <td>围绕身份、驱动力、真相、信息差、声音行为、维度摘要、关系和卡司宇宙管理角色。</td>
  </tr>
  <tr>
    <td><b>结构</b></td>
    <td>宏观组织层</td>
    <td>按项目、幕、序列、场景管理故事结构，并用自定义价值轴观察不同层级的情绪和意义变化。</td>
  </tr>
  <tr>
    <td><b>场景</b></td>
    <td>实际创作层</td>
    <td>提供剧本式 TipTap 编辑器、分页视图、结构联动栏和右侧节拍板，支持在写作时拆分场景节拍。</td>
  </tr>
  <tr>
    <td><b>提醒</b></td>
    <td>创作约束层</td>
    <td>用分类便利贴记录创作提醒，并发射到指定工作台、幕或序列，写作时以悬浮层方式提醒。</td>
  </tr>
  <tr>
    <td><b>导出</b></td>
    <td>输出层</td>
    <td>导出工作台已预留，PDF 导出是 MVP 收尾阶段的重点之一。</td>
  </tr>
</table>

---

## 设计原则

### 1. 创作者掌控，而不是工具代写

Story Studio 不以自动生成故事为核心，也不评价创作者的选择。它更像剪辑台、调色台、剧本板和导演笔记的组合：提供结构化反馈，但最终判断始终留给创作者。

### 2. 预设而非模板

工具可以提供纸张尺寸、结构层级、价值轴、人物维度和场景元素，但不强迫创作者套用某一种类型片公式。

### 3. 不同创作阶段使用不同界面

灵感需要自由，结构需要冷静，场景需要沉浸，人物需要关系化。Story Studio 不是把所有信息塞进同一个表格，而是让不同工作台拥有不同的交互气质。

### 4. 本地优先

当前阶段优先保证本地桌面体验和项目文件可控。项目数据以 JSON 文件为核心进行保存和导入，后续再考虑更完整的数据层和发布形态。

---

## 当前 MVP 状态

<table>
  <tr>
    <th>模块</th>
    <th>状态</th>
    <th>说明</th>
  </tr>
  <tr>
    <td>底部七工作台导航</td>
    <td>已完成</td>
    <td>灵感、世界、人物、结构、场景、提醒、导出入口已打通。</td>
  </tr>
  <tr>
    <td>灵感 / 世界画布</td>
    <td>已完成 MVP</td>
    <td>支持卡片、连线、拖拽、画布、绘图和基础编辑。</td>
  </tr>
  <tr>
    <td>人物工作台</td>
    <td>已完成 MVP</td>
    <td>包含人物列表、维度、关系、卡司宇宙和问询相关页面。</td>
  </tr>
  <tr>
    <td>结构工作台</td>
    <td>已完成 MVP</td>
    <td>支持项目 / 幕 / 序列 / 场景层级和价值曲线。</td>
  </tr>
  <tr>
    <td>场景编辑器</td>
    <td>已完成 MVP</td>
    <td>剧本元素、分页、结构上下文和节拍板已经接入。</td>
  </tr>
  <tr>
    <td>提醒工作台</td>
    <td>已完成 MVP</td>
    <td>支持分类、草稿、启用状态、目标发射和悬浮提醒。</td>
  </tr>
  <tr>
    <td>项目保存</td>
    <td>收尾中</td>
    <td>项目 JSON 保存 / 另存为 / 导入已接入，仍在完善最终体验。</td>
  </tr>
  <tr>
    <td>PDF 导出</td>
    <td>待完成</td>
    <td>MVP 收尾重点。</td>
  </tr>
  <tr>
    <td>开屏与项目大厅</td>
    <td>待完成</td>
    <td>用于形成更完整的启动和项目管理体验。</td>
  </tr>
</table>

---

## 界面预览

当前 README 先保留展示位。等 MVP 收尾完成后，建议补充以下截图或 GIF：

<table>
  <tr>
    <td width="50%"><b>场景工作台</b><br />剧本编辑器、结构栏、节拍板同屏联动。</td>
    <td width="50%"><b>结构工作台</b><br />项目 / 幕 / 序列 / 场景层级与价值曲线。</td>
  </tr>
  <tr>
    <td><b>人物工作台</b><br />人物维度、关系网络、卡司宇宙。</td>
    <td><b>灵感与世界画布</b><br />卡片、连线、绘图和自由组织。</td>
  </tr>
</table>

---

## 技术栈

<table>
  <tr>
    <td><b>桌面端</b></td>
    <td>Electron 39 + electron-vite</td>
  </tr>
  <tr>
    <td><b>前端框架</b></td>
    <td>Vue 3 + TypeScript</td>
  </tr>
  <tr>
    <td><b>状态管理</b></td>
    <td>Pinia</td>
  </tr>
  <tr>
    <td><b>路由</b></td>
    <td>Vue Router</td>
  </tr>
  <tr>
    <td><b>编辑器</b></td>
    <td>TipTap / ProseMirror</td>
  </tr>
  <tr>
    <td><b>可视化画布</b></td>
    <td>Vue Flow</td>
  </tr>
  <tr>
    <td><b>样式</b></td>
    <td>Tailwind CSS 4</td>
  </tr>
  <tr>
    <td><b>构建</b></td>
    <td>Vite 7 + electron-builder</td>
  </tr>
</table>

---

## 本地运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 类型检查

```bash
npm run typecheck
```

### 构建

```bash
npm run build
```

### 打包桌面应用

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## Roadmap

### MVP 收尾

- 完善项目保存、另存为、导入和异常恢复体验
- 实现 PDF 导出
- 完成开屏视觉和启动流程
- 完成项目大厅 / 项目入口
- 补充 README 截图、演示 GIF 和发布说明

### 后续方向

- 更完整的项目文件格式与版本迁移
- 导出更多格式和分析报告
- 世界观、人物、结构、场景之间更深的交叉引用
- 更稳定的分页和打印一致性
- 面向创作者的预设系统，而不是固定模板系统

---

## 开发说明

Story Studio 目前是个人独立开发项目，仍处于快速迭代阶段。仓库中的部分功能、数据结构和界面细节可能会随着 MVP 收尾继续调整。

如果你关注故事创作工具、剧本工程、长篇叙事管理或创作者工作流，欢迎持续关注这个项目。 
