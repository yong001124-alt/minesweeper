/* 猫咪如厕大冒险 · 像素素材数据
 * 字符画 → SVG 像素渲染（与 asset-preview.html 配套）
 * 验收通过后可直接移植进 src/App.jsx
 */

const PALETTE = {
  k: "#5C4033", // 描边深棕
  c: "#F6E7CD", // 奶油色身体
  d: "#E8D2AE", // 身体阴影
  o: "#E8855A", // 猫爪橙斑纹
  p: "#F2A7BB", // 樱花粉（耳内/腮红/鼻）
  e: "#3E3128", // 眼睛
  w: "#FFFFFF", // 白
  r: "#E05A5A", // 标记红
  B: "#6B4226", // 便便棕
  m: "#8A5A2E", // 便便高光
  s: "#C9A96E", // 猫砂
  S: "#EDE0C4", // 猫砂亮
  t: "#A07848", // 砂盆壁
  y: "#F2C14E", // 金色
  g: "#8DC87A", // 草地绿
  u: "#A8D4E6", // 天空蓝
};

// 夜晚剪影配色（故事动画第1幕用）
const SILHOUETTE = {
  k: "#1C1830",
  c: "#2B2438",
  d: "#2B2438",
  o: "#352C46",
  p: "#352C46",
  e: "#F2C14E", // 黑暗中发光的眼睛
  w: "#F2C14E",
};

const MAPS = {
  // ── 猫咪 · 端坐（默认）20×20：竖直耳 + 胡须 + 尾巴环绕身前（安静放松）──
  catSit: [
    "....kk........kk....",
    "...kcck......kcck...",
    "...kcpck....kcpck...",
    "..kkccckkkkkkccckk..",
    "..kcccccccccccccck..",
    "..kcoccccccccccock..",
    "k.kcceccccccccceck.k",
    "k.kccccccppcccccck.k",
    "..kcccccckkcccccck..",
    "...kcccccccccccck...",
    "...kcccccccccccck...",
    "...kccocccccoccck...",
    "...kcccccccccccck...",
    "...kcccccccccccck...",
    "...kcccccccccccckk..",
    "...kccccccccccckok..",
    "...kcwccccccwcckok..",
    "...kccccccccccckkk..",
    "....kckkkkkkkkck....",
    ".....kk......kk.....",
  ],

  // ── 猫咪 · 踮爪小心 20×20：正面构图（与其余三态同构）+ 瞪大双眼 + 竖举尾巴 + 长腿踮尖只剩趾尖着地 + 头侧汗滴（紧张专注）──
  catTiptoe: [
    "....kk........kk....",
    "...kcck......kcck.u.",
    "...kcpck....kcpck.u.",
    "..kkccckkkkkkccckk..",
    "..kcccccccccccccck..",
    "..kcoccccccccccock..",
    "k.kcceeccccccceeck.k",
    "k.kccccccppcccccck.k",
    "..kcccccckkcccccck..",
    "...kcccccccccccck.k.",
    "...kccocccccoccckkok",
    "...kcccccccccccckkok",
    "...kcccccccccccckkok",
    "...kkcckkkkkkcckk...",
    "....kcck....kcck....",
    "....kcck....kcck....",
    "....kcck....kcck....",
    ".....kck....kck.....",
    ".....kck....kck.....",
    "......k......k......",
  ],

  // ── 猫咪 · 惊吓 20×20：炸毛尖刺 + 耳朵压平 + 巨大白眼 + 张大嘴露舌 + 双爪举起（洁癖崩溃）──
  catShock: [
    "..k...k....k...k....",
    ".kkkk..........kkkk.",
    ".kccck........kccck.",
    "..kkcckkkkkkkkcckk..",
    "..kcccccccccccccck..",
    "..kcwweccccccewwck..",
    "..kcwweccccccewwck..",
    "k.kcccccccccccccck.k",
    "..kcccceeeeeecccck..",
    "..kcccceerreecccck..",
    "..kccccceeeeccccck..",
    "...kcccccccccccck...",
    "kcck.kcccccccck.kcck",
    "kcck.kcccccccck.kcck",
    ".kk..kccoccocck..kk.",
    ".....kcccccccck.....",
    ".....kcccccccck.....",
    ".....kkkkkkkkkk.....",
    "......kk....kk......",
    "....................",
  ],

  // ── 猫咪 · 满足 20×20：眯眯眼 ^ ^ + 大腮红 + 开口笑 + 竖起摇尾 + 飘起的小心心（幸福洋溢）──
  catHappy: [
    "....kk........kk....",
    "...kcck......kcck.p.",
    "...kcpck....kcpck...",
    "p.kkccckkkkkkccckk..",
    "..kcccccccccccccck..",
    "..kceecccccccceeck..",
    "..kppcccccccccppck..",
    "k.kccccccppcccccck.k",
    "..kcccccekkeccccck..",
    "...kcccccccccccck...",
    "...kcccccccccccck...",
    "...kccocccccoccck...",
    "...kcccccccccccck...",
    "...kcccccccccccck...",
    "...kcccccccccccck.k.",
    "...kcccccccccccckok.",
    "...kcwccccccwccck.k.",
    "...kcccccccccccck...",
    "....kckkkkkkkkck....",
    ".....kk......kk.....",
  ],

  // ── 便便 8×8 ──
  poop: [
    "........",
    ".....B..",
    "....BB..",
    "..BBBB..",
    ".BmBBBB.",
    ".BBBBmB.",
    "BBBBBBBB",
    "........",
  ],

  // ── 猫砂盆 24×8 ──
  box: [
    "........................",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    "kttttttttttttttttttttttk",
    "ktSSSSSSSSSSSSSSSSSSSStk",
    "ktSsSSSsSSSSsSSSsSSSSstk",
    "ktsssssssssssssssssssstk",
    "kttttttttttttttttttttttk",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
  ],

  // ══ 勋章图标 16×16 多色像素（名称连贯：猫如厕仪式六步——踏砂→嗅嗅→踮爪→刨坑→埋宝→加冕）══
  // Lv.1 踏砂小猫：肉垫爪踏进猫砂盆
  iconStep: [
    "................",
    "....cc.cc.cc....",
    "....cc.cc.cc....",
    "...cccccccccc...",
    "...cccccccccc...",
    "....cccccccc....",
    "................",
    "....y..y..y.....",
    ".kkkkkkkkkkkkkk.",
    ".kttttttttttttk.",
    ".ktSSSSSSSSSStk.",
    ".ktsssssssssstk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
    "................",
  ],
  // Lv.2 嗅嗅小猫：大粉鼻子嗅出线索（金色气味波）
  iconSniff: [
    "................",
    "..kk.....kk.....",
    ".kcck...kcck....",
    ".kccckkkccck..y.",
    ".kcccccccccck.y.",
    ".kcecccccceck..y",
    ".kccccppcccck.y.",
    ".kcccppppccck..y",
    ".kcccppppccck.y.",
    "..kcccccccck....",
    "...kkkkkkkk.....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // Lv.3 踮爪小猫：单爪踮在砂尖上（轻盈星点）
  iconTip: [
    "................",
    ".....kcck.......",
    ".....kcck.......",
    ".....kcck.......",
    "..y..kcck...y...",
    ".....kcck.......",
    ".y...kcck....y..",
    "....kcccck......",
    "....kcccck......",
    ".....kkkk.......",
    "................",
    "......ss........",
    "....ssssss......",
    "..ssssssssss....",
    "................",
    "................",
  ],
  // Lv.4 刨坑小猫：爪子刨出砂坑（砂粒飞溅）
  iconDig: [
    "................",
    "....cc.cc.cc....",
    "...cccccccccc...",
    "...cccccccccc...",
    "....cccccccc....",
    "..y....y....y...",
    ".y...y....y....y",
    "................",
    "..ssssssssssss..",
    ".ssssseeeesssss.",
    ".sssseeeeeessss.",
    ".ssssseeeesssss.",
    "..ssssssssssss..",
    "................",
    "................",
    "................",
  ],
  // Lv.5 埋宝小猫：砂丘掩埋完毕（只露便便尖 + 闪光）
  iconBury: [
    "................",
    "......y.........",
    "....y.....y.....",
    "..........w.....",
    ".......BB.......",
    "......BBBB......",
    ".....ssssss.....",
    "....ssssssss....",
    "...ssssssssss...",
    "..ssssssssssss..",
    ".ssssssssssssss.",
    "ssssssssssssssss",
    "................",
    "................",
    "................",
    "................",
  ],
  // Lv.6 如厕之王：戴皇冠的猫坐白瓷马桶王座
  iconKing: [
    "....y.y..y.y....",
    "....yyyyyyyy....",
    "...kk......kk...",
    "...kcck..kcck...",
    "...kccckkccck...",
    "...kcccccccck...",
    "...kcecccceck...",
    "...kcccppccck...",
    "....kcccccck....",
    "..wwwwwwwwwwww..",
    "..wwwwwwwwwwww..",
    "...weeeeeeeew...",
    "...wwwwwwwwww...",
    "....wwwwwwww....",
    "...wwwwwwwwww...",
    "................",
  ],

  // ══ 关卡地图场景道具（手绘像素，替代 Emoji 点缀）══
  // 爪印（地图路面装饰，低透明度使用）
  sprPaw: [
    "........",
    ".B.B.B..",
    "..BBBB..",
    ".BBBBBB.",
    ".BBBBBB.",
    "..BBBB..",
    "........",
    "........",
  ],
  // 毛线球（小房间）
  sprYarn: [
    "...pppp...",
    "..pppppp..",
    ".ppprrppp.",
    ".pprpprpp.",
    ".ppprrppp.",
    ".pprpprpp.",
    "..pppppp..",
    "...pppp...",
    ".....r....",
    "......rr..",
  ],
  // 树（别墅花园）
  sprTree: [
    "....gggg....",
    "..gggggggg..",
    ".gggggggggg.",
    ".ggyggggygg.",
    "..gggggggg..",
    "...gggggg...",
    "....gggg....",
    ".....tt.....",
    ".....tt.....",
    ".....tt.....",
    "....tttt....",
    "............",
  ],
  // 盆栽（公寓）
  sprPlant: [
    "....gg....",
    "..gggggg..",
    ".gggggggg.",
    "..gggggg..",
    "....gg....",
    "....gg....",
    "..tttttt..",
    "..tttttt..",
    "...tttt...",
    "...tttt...",
  ],
  // 别墅（地图终点，替代🏰emoji）
  sprVilla: [
    "............kk............",
    "..........kkrrkk..........",
    "........kkrrrrrrkk........",
    "......kkrrrrrrrrrrkk......",
    "....kkrrrrrrrrrrrrrrkk....",
    "....kcccccccccccccccck....",
    "....kcyyccyyccyyccyyck....",
    "....kcyyccyyccyyccyyck....",
    "....kcccccccccccccccck....",
    "....kcccccccBBccccccck....",
    "....kcccccccBBccccccck....",
    "....kkkkkkkkkkkkkkkkkk....",
  ],
};

if (typeof module !== "undefined") module.exports = { PALETTE, SILHOUETTE, MAPS };
