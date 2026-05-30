<div align="center">

# Story Studio

### 面向长篇故事创作者的本地优先创作工作台

Story Studio 是一个帮助创作者组织灵感、人物、结构、场景、提醒与输出的 Story Operating System。

<br />

<b>灵感</b> · <b>世界</b> · <b>人物</b> · <b>结构</b> · <b>场景</b> · <b>提醒</b> · <b>导出</b>

<br />

<img alt="Vue" src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square" />
<img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848f?style=flat-square" />
<img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square" />
<img alt="License" src="https://img.shields.io/badge/License-AGPL--3.0--only-blue?style=flat-square" />

</div>

---

## 当前状态

Story Studio 当前处于 `v0.1.0-alpha` 早期预览阶段。

这个版本适合用于本地试用、整理故事项目、体验多工作台创作流程，并向项目提供反馈。Alpha 阶段的数据结构和界面细节仍可能继续迭代；在升级版本或处理重要项目之前，建议备份项目文件。

---

## 项目简介

Story Studio 是为小说作者、编剧、游戏叙事设计师、动画导演等长篇故事创作者准备的本地桌面工作台。

它关注的不是替创作者生成一段文本，而是把故事背后的复杂系统搭起来：灵感碎片、世界规则、人物动力、结构曲线、场景推进、节拍拆分、创作提醒，最终汇入可以持续创作、复盘和导出的项目文件。

Story Studio 希望成为创作者掌控的故事控制台：不替创作者判断故事好坏，而是让故事系统可视化、可编辑、可追踪。

---

## 为什么做 Story Studio

很多写作工具把重点放在文本编辑或 AI 续写上，但长篇故事真正困难的部分往往不是打字，而是：

<table>
  <tr>
    <td width="33%"><b>信息太散</b><br />灵感、人物、设定、场景笔记分散在不同文档里，很难形成整体。</td>
    <td width="33%"><b>结构太隐形</b><br />故事节奏、价值变化、人物弧光常常藏在脑子里，修改时很难定位问题。</td>
    <td width="33%"><b>创作太容易跑偏</b><br />写到后期，经常忘记最初设定、人物欲望、主题约束和场景目标。</td>
  </tr>
</table>

Story Studio 的目标是把这些隐形信息变成可操作的创作界面，让创作者在灵感、结构、人物和正文之间来回切换时，仍然能看见同一个故事系统。

---

## Alpha 阶段能力

<table>
  <tr>
    <th width="16%">工作台</th>
    <th width="26%">定位</th>
    <th>当前能力</th>
  </tr>
  <tr>
    <td><b>灵感</b></td>
    <td>创作输入层</td>
    <td>用自由画布收集文本、图片、PDF、音频等灵感素材，并通过卡片、连线和绘图组织关系。</td>
  </tr>
  <tr>
    <td><b>世界</b></td>
    <td>外围规则层</td>
    <td>用对象、分类、颜色和画布关系整理世界观、阵营、规则、地点、道具等设定。</td>
  </tr>
  <tr>
    <td><b>人物</b></td>
    <td>故事动力系统</td>
    <td>围绕人物列表、维度、关系、卡司宇宙和问询页面管理角色。</td>
  </tr>
  <tr>
    <td><b>结构</b></td>
    <td>宏观组织层</td>
    <td>按项目、幕、序列、场景组织故事结构，并用自定义价值轴观察不同层级的变化。</td>
  </tr>
  <tr>
    <td><b>场景</b></td>
    <td>实际创作层</td>
    <td>提供剧本式编辑器、分页视图、结构联动栏和右侧节拍板，支持在写作时拆分场景节拍。</td>
  </tr>
  <tr>
    <td><b>提醒</b></td>
    <td>创作约束层</td>
    <td>用分类便利贴记录创作提醒，并发射到指定工作台、幕或序列，写作时以悬浮层方式提醒。</td>
  </tr>
  <tr>
    <td><b>导出</b></td>
    <td>输出层</td>
    <td>提供 PDF 预览与导出入口，用于把当前创作内容输出为可查看文件。</td>
  </tr>
</table>

---

## 项目与文件

Story Studio 当前采用本地优先的项目文件模式：

- 支持新建项目、打开项目、最近项目入口。
- 支持项目 JSON 保存、另存为和导入。
- 支持导入图片、音频、PDF、文本等素材到项目资源目录。
- 支持设置开屏偏好和默认工作台。

项目数据主要保存在本地 JSON 项目文件中。Alpha 阶段仍建议为重要项目保留额外备份。

---

## 设计原则

### 1. 创作者掌控，而不是工具代写

Story Studio 不以自动生成故事为核心，也不评价创作者的选择。它更像剪辑台、调色台、剧本板和导演笔记的组合：提供结构化反馈，但最终判断始终留给创作者。

### 2. 预设而非模板

工具可以提供纸张尺寸、结构层级、价值轴、人物维度和场景元素，但不强迫创作者套用某一种类型片公式。

### 3. 不同创作阶段使用不同界面

灵感需要自由，结构需要冷静，场景需要沉浸，人物需要关系化。Story Studio 不是把所有信息塞进同一个表格，而是让不同工作台拥有不同的交互气质。

### 4. 本地优先

当前阶段优先保证本地桌面体验和项目文件可控。项目数据以本地文件为核心进行保存、另存为、打开和导入。

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

### 生产构建

```bash
npm run build
```

### 预览构建产物

```bash
npm run start
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

## 后续计划

- 持续打磨项目保存、打开、最近项目和异常恢复体验。
- 完善 PDF 输出、项目资料输出和导出工作台的信息组织。
- 增强世界观、人物、结构、场景之间的交叉引用。
- 提升分页、打印和导出的一致性。
- 扩展面向创作者的预设系统，而不是固定模板系统。
- 补充更完整的截图、演示和发布说明。

---

## 许可证

Story Studio 使用 [GNU Affero General Public License v3.0](LICENSE) 授权。

---

## 参与与反馈

Story Studio 是个人独立开发并持续迭代的开源项目。如果你关注故事创作工具、剧本工程、长篇叙事管理或创作者工作流，欢迎试用 Alpha 版本并反馈真实创作场景中的问题。
