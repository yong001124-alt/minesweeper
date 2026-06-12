# 猫咪如厕大冒险（原「铲屎官日记」）· 开发说明文档

> 产品设计总览见 `DESIGN.md`（v2.0），本文档聚焦**代码架构与开发规范**。

## 项目概览

**游戏定位**：以「独居猫咪第一人称如厕冒险」为主题包装的扫雷游戏，面向女性宠物主用户，休闲优先。  
**叙事设定**：你是一只独自生活的小猫，没人清理猫砂盆——每次上厕所都要靠鼻子（数字线索）避开自己以前拉的便便💩。  
**核心玩法**：扫雷逻辑不变——用数字推理位置，找出隐藏的便便，安全探明所有干净砂地。

## ⚠️ v2 需求更新（2026-06-11，详见 DESIGN.md v2.0；已于 2026-06-11 全部实现，见下方「v2 已实现」清单）

1. **叙事切换**：铲屎官第三人称 → 猫咪第一人称（全部文案、HUD、教学、标题需替换）
2. **关卡地图**：封闭上升路线，严格顺序解锁、**不可跳关**；竖屏单列蜿蜒，底部=第1关向上攀升，自动滚动定位当前关（拇指热区）
3. **棋盘场景升级**：5 场景换肤 —— 🥣小号猫砂盆(1-4) → 🛁大号猫砂盆(5-8) → 🚪小房间(9-12) → 🏢公寓(13-16) → 🏰别墅(17-20)，只换 CSS 皮肤不动逻辑
4. **启动流程**：首次进入播放 4 幕故事动画（`phase="intro"`，localStorage `seenIntro` 标记）；非首次显示主视觉首页
5. **成长体系**：6 级等级（砂盆新手→别墅之王）+ 像素勋章（Neko Station 风格基准），升级时颁发，勋章墙 + localStorage 持久化

> **素材验收稿**：项目根目录 `asset-preview.html` + `asset-sprites.js`（浏览器直接打开）。已与用户多轮确认：猫咪四态像素画、Key Art（六层景深）、4幕故事动画（与 Key Art 同风格）、6 枚如厕主题勋章、5 场景造型外框、排雷交互动画、关卡地图设计稿。**实现时以验收稿的视觉效果为准**，像素画数据可直接从 asset-sprites.js 移植。

单文件 React 游戏，约 2260 行，文件路径 `src/App.jsx`。  
手机优先设计，无外部 npm 依赖（操作音效用 Web Audio API 合成；猫叫声用 `public/sounds/` 下 7 个 Mixkit mp3 素材，经 Web Audio 解码播放、加载失败自动回退合成喵；粒子用 Canvas 绘制）。

**技术栈**：React + Vite，无其他 npm 包依赖。

---

## 视觉风格基准（已确认）

**参考来源**：Neko Station（Steam，截图存于项目根目录 `ss_*.jpg`）

### 核心风格关键词
> 16-bit 像素艺术 · 低饱和高温度配色 · 治愈系 · 细节丰富不杂乱

### 确认配色系统

```
背景/场景色（来自 Neko Station 天空+草地色调）
  --sky-blue:    #A8D4E6   ← 天空蓝（背景主色）
  --cloud-white: #F0EDE4   ← 云朵奶白（卡片/弹窗背景）
  --grass-green: #8DC87A   ← 草地绿（通关/安全色）

格子色（来自猫砂盆色调）
  --sand-undig:  #C9A96E   ← 未铲开：暖沙棕（渐变到 #B8935A）
  --sand-dug:    #EDE0C4   ← 铲开后：奶白沙色
  --sand-border: #A07848   ← 格子边框：深棕（立体感）

强调色（来自车厢内装饰）
  --sakura-pink: #F2A7BB   ← 樱花粉（主按钮/强调）
  --wood-brown:  #8B6355   ← 原木棕（文字/次要边框）
  --paw-orange:  #E8855A   ← 猫爪橙（当前关卡/激活态）

功能色
  --poop-brown:  #6B4226   ← 便便棕（cell.mine 揭示色）
  --flag-red:    #E05A5A   ← 标记红（旗帜/警示）
```

### 格子视觉规格（像素艺术风格）

```
未铲开格（猫砂堆）：
  ├ 背景：#C9A96E 渐变至 #B8935A（左上→右下）
  ├ 上边/左边高光：1px #DDBF82（亮边，模拟像素光源左上角）
  ├ 下边/右边阴影：1px #8A6030（暗边，模拟像素立体）
  ├ 内部：CSS 点噪声 or box-shadow 模拟砂粒颗粒感
  └ 圆角：2px（像素风保持方正，略微软化）

铲开格（干净猫砂）：
  ├ 背景：#EDE0C4（微内凹感，inset shadow）
  ├ 边框：1px inset #C8B48A
  └ 数字颜色：像素风暖色系（见下方数字色表）

便便格（cell.mine 被揭示）：
  ├ 背景：#FFE8D6（浅暖红晕）
  ├ 中心：像素风圆润💩图形（CSS绘制或 emoji）
  └ 失败时：棕色像素粒子爆开

旗帜格（已标记）：
  ├ 图标：像素猫爪 🐾 或竖爪小猫简笔
  └ 颜色：樱花粉底 + 猫爪橙图标
```

### 数字配色（对齐像素风暖色系）

```js
// 替换原蓝紫冷色系为暖色像素系
NUM_COLOR = ["","#E8855A","#8DC87A","#E05A5A","#C9A96E","#F2A7BB","#A8D4E6","#EDE0C4","#B8935A"]
//           空  1=橙     2=绿     3=红     4=沙棕   5=粉     6=天蓝   7=奶白   8=深棕
```

### UI 整体氛围
- **字体**：系统圆体（PingFang SC / system-ui），不用像素字体（保证移动端可读性）
- **背景**：柔和手绘感场景色（天空蓝 → 草地绿渐变），类似 Neko Station 截图一的背景
- **图标**：优先用 Emoji，辅以 CSS 绘制的像素小图形
- **动效节奏**：轻盈、弹性、不夸张——治愈系不等于激烈反馈

### 主题元素对照表（v2 · 猫咪第一人称）

| 扫雷原概念 | 猫咪版本 | 代码变量/常量 |
|-----------|-----------|-------------|
| 地雷 💣 | 我以前拉的便便 💩 | `cell.mine` |
| 翻开格（安全） | 探明的干净砂地 ✨ | `cell.revealed` |
| 插旗 🚩 | 猫咪记号 🐾（这里有屎） | `cell.flagged` |
| 数字 1-8 | 鼻子嗅出的线索 👃 | `cell.count` |
| 踩雷失败 | 踩到自己的便便 😱 | `gs === "lost"` |
| 通关成功 | 优雅如厕成功 😸 | `gs === "won"` |
| 挖掘模式 ⛏ | 探砂模式 🐾（绿色按钮） | `flagMode === false` |
| 插旗模式 🚩 | 记号模式 🚩（橙色按钮） | `flagMode === true` |

> **棋盘与底栏以验收稿为准**（asset-preview.html ⑤⑥，已实现）：5 场景结构性外框（盆沿握把/顶罩拱门+😺/墙纸窗户相框踢脚线/楼顶亮灯窗+阳台栏杆/尖屋顶烟囱金柱+树篱）= `SCENE_SKIN` + 棋盘区结构件 JSX；格子 = 多层砂粒噪点（`cellSandBg`）+ 翻开耙砂纹（`cellDugBg`），格间 gap 2px（≥20 列时 1px）；模式切换 = 单个 demo-btn 色块按钮（绿⇄橙，`0 3px 0` 按压底边）；底栏反应猫 = 四态像素猫 Sprite（catSit/catShock/catHappy），同时是重试按钮。

---

## 核心架构

### 阶段系统（phase）
```
phase = "intro"    → 首次进入的故事动画（4幕，localStorage.seenIntro 标记；首页可「重看故事」）
phase = "home"     → 首页（非首次入口；Key Art 主视觉 + 继续冒险 + 重看故事 + 勋章墙）
phase = "select"   → 关卡地图（封闭上升路线，严格顺序解锁，20关，底部=第1关）
phase = "tutorial" → 3关教学（如厕入门）
phase = "game"     → 正式游戏关卡
```

> dev 调试 URL 参数（仅开发用）：`?phase=select|game|tutorial|intro|home`、`&best=N`（模拟前 N 关已通关）、`&lv=N`、`&tut=N`、`&scene=N`（intro 幕）、`&rankup=N`、`&medals=1`、`&noanim=1`（关动画，截图用）。
> 本机无头截图：Edge headless 视口固定 470px 宽，用 `--window-size=470,705` 截全视口。
- 首次启动 → `intro` 故事动画 → 教学（可跳过）；非首次 → `home`
- 教学完成后 → 自动进入 `select`（关卡地图）
- 关卡地图 → 只能点击「当前关卡」或已通关关卡，未解锁节点不可点（v2：不可跳关）

### 关卡系统
- **教学关**：`TUTORIALS[tutIdx]`，预设棋盘（非随机），3关
  - TUT0 `认识数字`：3×3，教「数字=周围便便数」
  - TUT1 `插旗标记`：3×4，教「插旗标记便便」
  - TUT2 `综合推理`：3×5，教「推理+行动」
- **正式关**：`LEVELS[levelIdx]`，20关，5×5(3💩) 到 16×30(170💩)，瀑布式渐进难度
- 每关通关后 1.6-2.8 秒自动进入下一关，无需用户点击

### 关卡分类（CATEGORIES，v2 已实现：5 场景 × 4 关）

```js
{ label:"小号猫砂盆", emoji:"🥣", color:"#C9A96E", range:[0,3]  }  // 5×5 → 8×8
{ label:"大号猫砂盆", emoji:"🛁", color:"#7FB8D4", range:[4,7]  }  // 9×9 → 11×14
{ label:"小房间",     emoji:"🚪", color:"#C8927A", range:[8,11] }  // 12×16 → 13×20，木地板皮肤
{ label:"公寓",       emoji:"🏢", color:"#9A8FB8", range:[12,15]}  // 14×22 → 15×26，地砖皮肤
{ label:"别墅",       emoji:"🏰", color:"#D4A85A", range:[16,19]}  // 16×28 → 16×30，大理石皮肤
```
场景换肤已实现：`SCENE_SKIN[Math.floor(levelIdx/4)]`（棋盘外框/未翻格渐变/页面背景一组皮肤值），教学关固定用基准猫砂盆皮肤，逻辑层零改动。地图章节背景为 `SCENE_BG`，勋章映射 `CHAPTER_MEDAL`，等级表 `RANKS`（6 级，`currentRank(bestTimes)` 由通关进度推导，无独立存储）。像素素材已从 asset-sprites.js 移植进 App.jsx（`SPR` + `<Sprite>` 组件）。

### 活跃关卡尺寸（关键）
```js
const _activeLv = phase==="tutorial" ? TUTORIALS[tutIdx] : LEVELS[levelIdx];
const rows = _activeLv.rows, cols = _activeLv.cols, mines = _activeLv.mines;
```
`rows/cols/mines` 在组件顶层声明，所有处理函数都用这三个变量，不要用 `LEVELS[levelIdx]` 直接取。

---

## 布局系统（重要）

### 固定比例游戏视口（v2）
整个游戏渲染在固定 390:844 比例的视口内（`frameRef`），宽屏浏览器下居中信箱式呈现（两侧深色留白）：
```js
width:  min(100vw, calc(100dvh * 390 / 844))
height: min(100dvh, calc(100vw * 844 / 390))
```
- 所有全屏覆盖层（Splash/升级仪式/勋章墙/背景）用 `position:absolute`（相对视口框），不要用 `fixed`（会铺满浏览器窗口）；粒子 canvas 例外（fixed 全窗，坐标取 `frameRect()`）。
- 尺寸计算（cs、烟花坐标）一律基于 `frameRect()`，不要直接用 `window.innerWidth/innerHeight`。

### 固定高度预算
```
视口总高 = TOP_H(52px) + 棋盘区(flex:1) + BOT_H(72px)
```
三个区域 `flexShrink:0`，棋盘区 `flex:1` 吃掉剩余空间。

### 格子尺寸计算
```js
const availW = window.innerWidth;
const availH = window.innerHeight - TOP_H - BOT_H;
const byW = Math.floor(availW / cols);
const byH = Math.floor(availH / rows);
cs = Math.max(18, Math.min(56, Math.min(byW, byH)));
```
同时按宽和高约束，取最小值，确保棋盘在两个方向都不溢出。
监听 `window.resize` 事件，关卡切换（rows/cols 变化）时重算。

### 棋盘填满原则
- 棋盘容器：`flex:1, overflow:hidden`
- 棋盘本身：`width: boardW(cs*cols), height: boardH(cs*rows), flexShrink:0`
- 每行：`display:flex, flex:1`
- 每格：`flex:1`，不要用固定 `width:cs height:cs`

### CSS 全局（index.css 必须有）
```css
html, body { width: 100%; height: 100%; margin: 0; }
#root { width: 100%; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
```
如果棋盘位置不对，先检查 index.css 是否有这段。

---

## 触控系统（手机关键）

### 长按标记便便
```
onTouchStart → 启动 450ms 计时器
onTouchEnd   → 计时器还在 = 短按(铲砂/标记) / 计时器已触发 = 长按(标记)
onTouchMove  → 清除计时器（防止滑动误触）
```

### 失败/胜利时必须放开触控
```js
touchAction: (gs==="won" || gs==="lost") ? "auto" : "none"
```
游戏结束时 `touchAction` 必须改回 `auto`，否则底部按钮收不到触摸事件。
这是最容易忽略的 bug，CSS 层拦截优先于 JS 事件。

### 失败重试
失败时棋盘上覆盖一个全屏 overlay（`position:absolute, inset:0, zIndex:30`），
点击任意位置重试，不依赖底部按钮。overlay 的 `onTouchEnd` 直接调用 `retryLevel()`。

### 底部按钮
`onTouchEnd` 直接触发操作，不依赖 `onClick`（移动端 onClick 有 300ms 延迟）。

---

## 视觉反馈系统

### 设计原则（基于心理学）
- **心流理论**：过程中反馈在周边视野，不夺取焦点
- **峰终定律**：只有通关是强反馈，平时极度克制
- **可变比率强化**：里程碑触发，不是每次点击都给

### 正反馈 — 里程碑触发（不是每格）
```
安全格总数 = rows*cols - mines
25% 完成 → 棋盘中心一圈扩散环（tier 1，最克制）      → 目标色：暖绿 #A8D8A8
50% 完成 → 双层扩散环 + 8条短辐射线（tier 2）         → 目标色：猫爪橙 #FF8C42
75% 完成 → 三圈扩散环 + 两角小烟花（tier 3）          → 目标色：粉嫩 #FFB5C8
100% 通关 → 全边缘烟花级联（7波，屏幕角落和边缘）      → 爱心+爪印粒子（待实现）
```
每个里程碑用 `milestones` Set 记录，每关只触发一次。

### 烟花系统（strand 粒子）
烟花不是圆形粒子，是**弧线拖尾**：
- 每条线是 `strand` 类型粒子，维护历史坐标队列（14-26帧）
- 用 `quadraticCurveTo` 画贝塞尔曲线，头部最粗最亮，尾部渐细渐透明
- 每发烟花选一套单色方案（6种），不混色
- 只在屏幕边缘和角落爆发，通关 Splash 卡片所在的中心区域留空
- **目标改造**：通关烟花改为爱心💕 + 猫爪印🐾形状粒子（见 DESIGN.md 第七节）

### 负反馈 — 铲到便便（原爆炸烟雾）
当前实现：爆炸烟雾（9波，约2.2秒）。
**目标改造**（见 DESIGN.md P2 优先级）：
- 即时：棕色粒子爆开 + 波浪状臭气线向上飘
- 替换颜色：`#6B3F2A`（便便棕）为主，去掉黑色烟雾
- 音效：滑稽「噗」声取代爆炸音

### 音效（操作音效 Web Audio 合成 + 猫叫声 mp3 素材）
```
操作音效 —— Web Audio API 实时合成，无外部文件：
  铲开砂子：沙沙声（白噪声 + 带通滤波），playReveal 音调随数字 1-8 递升，大片揭开 playCascade
  踩到便便：滑稽「噗」声（playExplosion，低频振荡器下滑 + 方波溅射）
  猫咪嘶叫：playRumble（锯齿波 + 高通噪声，踩雷后 1100ms）
  插旗/取消：可爱「叮」声（playFlag，正弦钟声 880Hz + 八度泛音）/ playUnflag
  通关：小猫「喵～」+ C大调五声音阶（playLevelUp）
  其他：playClick / playCombo / playTick（计时滴答）

猫咪叫声 —— playMeow(type)，真实素材优先、合成兜底：
  素材：public/sounds/ 7 个 mp3（Mixkit License，免署名可用于游戏），
        音频初始化时 fetch + decodeAudioData 预载为 AudioBuffer（meowBufs）
  播放：BufferSource 输出，每类型独立音量/变速见 MEOW_PLAY 表；
        某文件加载失败时该类型自动回退三角波合成喵（MEOWS 音高曲线表，基频滑音 + vibrato + 短包络）
  类型：enter（进关元气短喵）/ cascade（连开≥12格兴奋喵，延迟280ms）/ milestone（里程碑满足呼噜）/
        shock（踩屎惊叫）/ whine（踩屎哀怨长喵）/ rankup（颁章庄重喵 + 钟声泛音，素材/合成两路径都叠）/
        retry（重试振作短哼）
  约束：叫声音量 ≤ 操作音效；同一时刻只播一个喵声（meowStop 打断机制，后到打断先到）

踩到便便完整时序：
  playExplosion(0ms) → playMeow("shock")(550ms) → playRumble(1100ms) → playMeow("whine")(1750ms)
```

### 涟漪动画
每格揭开延迟 `dist * 90ms`（dist=曼哈顿距离），从点击格向外波浪扩散。
动画：`rippleIn`，scale 0.5→1.06→1，柔和淡入（不是剧烈弹跳）。
**目标改造**：铲开时有短暂「砂子飞溅」粒子（3-5颗沙粒小点向外散开）。

---

## 教学关系统

### 结构
```js
TUTORIALS = [TUT0, TUT1, TUT2]
// TUT0: 3×3，教「认识数字：数字=周围便便数」
// TUT1: 3×4，教「插旗标记：标记确定的便便位置」
// TUT2: 3×5，教「综合推理：推理+插旗+铲砂」
```

### 预设棋盘
用 `buildTutorialBoard(rows, cols, spec)` 构建，`spec` 指定哪些格已揭开、哪些是便便。
教学关 `gs` 初始设为 `"playing"`（不需要第一次点击）、`firstClick=false`。

### 提示系统
- `tutHint`：当前显示第几条提示
- `tutHighlight`：需要绿框高亮的格子坐标数组 `[[r,c],...]`
- 触发条件：`"start"`（关卡加载时）、`"first_reveal"`（第一次铲格后）、`"flagged"`（插旗后）
- 高亮样式：`outline: 2px solid rgba(74,222,128,.8)`

### 教学提示文案（铲屎官主题）
- TUT0 start：`"数字 = 周围8格中的便便数\n「1」= 附近有1坨便便\n「0」= 周围完全干净\n\n▶ 点击右下角的干净猫砂"`
- TUT1 start：`"🚩 学习标记！\n右上「1」旁只有1格未铲开\n——那格必定是便便\n\n切换到 🚩 标记模式，标记它"`
- TUT2 start：`"⚡ 综合推理！\n左侧「1」旁只有1格未铲开 → 那就是便便\n右侧同理\n\n用 🚩 标记模式标记两坨便便"`

### 跳过按钮
右上角「跳过教学」，直接 `setPhase("select")`。

---

## 状态变量速查

| 变量 | 类型 | 说明 |
|------|------|------|
| `phase` | `"home"\|"select"\|"tutorial"\|"game"` | 当前阶段 |
| `tutIdx` | 0-2 | 当前教学关索引 |
| `tutHint` | number | 当前提示索引 |
| `tutHighlight` | `[[r,c]]` | 高亮格子 |
| `levelIdx` | 0-19 | 当前正式关索引 |
| `board` | 二维数组 | 棋盘状态（`cell.mine` 即便便） |
| `gs` | `"idle"\|"playing"\|"won"\|"lost"` | 游戏状态 |
| `mLeft` | number | 剩余便便数（标记后减少） |
| `firstClick` | bool | 第一次点击前不放便便（保证首铲安全） |
| `flagMode` | bool | 底栏标记/铲砂模式切换 |
| `milestones` | Set | 已触发的里程碑百分比 |
| `combo` | number | 本关累计铲开格数 |
| `showLevelUp` | bool | 通关Splash显示 |
| `cs` | number | 当前格子像素尺寸 |

---

## 常见 Bug 和修复方式

### 棋盘不填满屏幕
1. 检查 `index.css` 是否有 `#root { height: 100dvh }`
2. 检查棋盘容器是否 `flex:1`
3. 检查 `cs` 计算是否同时用了宽和高

### 手机点击无响应
1. 检查 `touchAction` 是否在 lost/won 时改回 `auto`
2. 检查 `onTouchEnd` 是否有 `e.preventDefault()` 阻止了传播
3. 失败重试应该用 overlay 而不是依赖底部按钮

### 关卡切换后格子尺寸不对
`useEffect` 的依赖数组必须包含 `[aRows, aCols]`，关卡变化时重新计算 `cs`。

### 教学关不显示
检查 `startTutorial(idx)` 第一行是否有 `setPhase("tutorial")`（之前曾是 bug 根源）。

### 里程碑重复触发
`milestones` Set 在 `startLevel()` 和 `startTutorial()` 里必须重置：`setMilestones(new Set())`

---

## 待实现（按优先级）

### P0 — 文案与配色（最快见效）✅
- [x] 配色系统换为暖米/猫爪橙/棕
- [x] 关卡名从军衔体系改为铲屎官等级
- [x] 通关鼓励语替换为猫咪主题文案
- [x] 底部按钮文案：`🐾 铲砂` / `🐱 标记`
- [x] HUD 雷计数器改为便便图标 💩

### P1 — 格子视觉与关卡路径 ✅
- [x] 未翻格：砂粒渐变 + 像素3D立体边框
- [x] 翻开格：干净浅米色 + 内凹阴影
- [x] 便便格：浅暖红背景晕
- [x] 关卡选择页：多邻国蜿蜒路径风格（SVG连线 + 节点 + 章节头）
- [x] 章节标题（新手/熟练/高手/大师 pill 标签）

### P2 — 动效与图标 ✅
- [x] 铲开动效：砂子飞溅粒子（sandSplash，每格揭开都触发）
- [x] 踩到便便：棕色粒子 + 臭气上升云（poopParticles/poopCloud/stinkRise）
- [x] 通关烟花：💕 heartFirework + 🐾 pawFirework 交替
- [x] 里程碑 strand：暖橙/粉色系

### P3 — 音效与角色
- [x] 沙沙声（铲砂 playReveal/playCascade — 白噪声 + 带通滤波）
- [x] 「噗」声（踩到便便 playExplosion — 低频振荡器下滑 + 方波溅射）
- [x] 猫咪惊叫（由 `playMeow("shock")` 承担；原 playAfterShock 合成版已删除）
- [x] 猫咪嘶叫（playRumble — 锯齿波 + 高通噪声）
- [x] 叮声（插旗 playFlag — 正弦钟声 880Hz + 八度泛音）
- [x] 「喵～」+ 五声音阶（通关 playLevelUp — 三角波 meow + C大调五声）
- [ ] 教学引导角色「咪咪」简笔插图（可选）

## v2 已实现（2026-06-11 新需求，同日完成，按优先级）

### P0 — 叙事切换 + 关卡地图
- [x] 全部文案切换为猫咪第一人称（标题/HUD/教学提示/通关鼓励语/失败提示/按钮文字，文案表见 DESIGN.md 第七、九、十一节）
- [x] 关卡地图严格顺序解锁：未通关的关卡不可点击（移除任何跳关入口），未解锁节点点击给轻微抖动反馈
- [x] 关卡地图竖屏重排：底部=第1关向上攀升，进入时自动滚动使当前关位于屏幕中部偏下，节点 ≥56px，章节横幅 sticky
- [x] 关卡地图整幅场景背景（禁用 Emoji 点缀）：各章节铺满场景材质 + 手绘像素道具（砂地/格砖/墙纸/公寓墙/大理石，详见 DESIGN.md 4.2），中轴浅色通道，顶部 Key Art 天空 + 像素别墅终点
- [x] 关卡地图勋章同步：章节横幅带迷你勋章图标；4/8/12/16/20 关节点挂勋章角标（未达成灰色剪影）

### P1 — 场景换肤 + 启动流程
- [x] CATEGORIES 重构为 5 场景（见上方关卡分类 v2 目标）
- [x] 场景换肤：每场景一组 CSS 变量（棋盘外框/未翻格纹理/页面背景），`levelIdx` 推导场景索引
- [x] `phase="intro"`：首次进入 4 幕故事动画（CSS 关键帧 + Emoji，每幕约 3s，可跳过；分镜与旁白见 DESIGN.md 6.1），完成后写 `localStorage.seenIntro=1`；**风格与 Key Art 一致**（木牌字幕、同款窗户/地面/星月/投影）
- [x] 首页主视觉：非首次进入展示 Key Art（CSS/SVG 分层绘制，`src/assets/hero.png` 可作底图候选）+「继续冒险」按钮 +「重看故事」入口

### P2 — 成长体系
- [x] 等级体系：6 级 =「猫如厕仪式六部曲」（踏砂小猫→嗅嗅小猫→踮爪小猫→刨坑小猫→埋宝小猫→如厕之王），通关各场景末关时升级；称号必须是猫自己（禁用「达人」等类人类称谓）
- [x] 像素勋章：16×16 多色像素（禁用禁止符设计、不用大色块），八角形徽章；图案数据见 asset-sprites.js iconStep/iconSniff/iconTip/iconDig/iconBury/iconKing
- [x] 升级仪式：升级时全屏卡片，勋章放大入场 + 爪印粒子 + 喵声变奏
- [x] 勋章墙：首页/地图顶栏入口，未获得显示剪影 + 解锁条件，进度存 localStorage

### P3 — 猫咪叫声体系（音效补充，详见 DESIGN.md 10.3）
- [x] 统一 `playMeow(type)`：**真实猫叫素材优先**（`public/sounds/` 7 个 Mixkit mp3，预载为 AudioBuffer，按 `MEOW_PLAY` 表取音量/变速），加载失败回退合成喵（三角波基频滑音 + vibrato + 短包络，`MEOWS` 音高曲线表）
- [x] 叫声类型：进入关卡（元气短喵）、大片连开（兴奋喵）、里程碑（满足呼噜）、踩到便便（惊叫 + 哀怨长喵，叠在「噗」声后）、升级颁章（庄重长喵+钟声泛音）、重试（振作短哼）——括号内描述以 mp3 素材为准，合成兜底曲线参数见 `MEOWS` 表
- [x] 约束：叫声音量 ≤ 操作音效；同一时刻只播一个喵声（后到打断先到）

---

## 开发规范

- 所有修改在 `src/App.jsx` 单文件内完成
- 不引入新的 npm 包（图形用 CSS + SVG + Canvas，图标用 Emoji）
- 保持手机优先，桌面兼容
- 触控相关改动必须同时处理 `onClick`（桌面）和 `onTouchEnd`（手机）
- 修改布局后检查：棋盘是否仍然填满屏幕、底部栏是否固定在底部
- 核心游戏逻辑（扫雷算法、涟漪系统、粒子框架）不动，只替换视觉表现层
- 设计决策以 `DESIGN.md` 为准，代码实现以本文档为准
