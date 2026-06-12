import { useState, useEffect, useRef } from "react";

// ─── 20-level progression（v2 · 猫咪第一人称，5 场景 × 4 关）──────────────────
const LEVELS = [
  { id:1,  name:"初次踏砂",   emoji:"🐾", rows:5,  cols:5,  mines:3  },
  { id:2,  name:"鼻子开窍",   emoji:"👃", rows:6,  cols:6,  mines:5  },
  { id:3,  name:"有点臭了",   emoji:"😅", rows:7,  cols:7,  mines:8  },
  { id:4,  name:"小盆毕业",   emoji:"🎓", rows:8,  cols:8,  mines:12 },
  { id:5,  name:"搬进大盆",   emoji:"🛁", rows:9,  cols:9,  mines:16 },
  { id:6,  name:"双色砂丘",   emoji:"✨", rows:10, cols:10, mines:20 },
  { id:7,  name:"踮爪修行",   emoji:"🐈", rows:11, cols:11, mines:26 },
  { id:8,  name:"大盆制霸",   emoji:"💪", rows:12, cols:12, mines:33 },
  { id:9,  name:"溜出砂盆",   emoji:"🚪", rows:13, cols:13, mines:40 },
  { id:10, name:"木地板上",   emoji:"🐾", rows:14, cols:14, mines:48 },
  { id:11, name:"毛线阵地",   emoji:"🧶", rows:15, cols:15, mines:56 },
  { id:12, name:"房间巡礼",   emoji:"🛏️", rows:15, cols:15, mines:65 },
  { id:13, name:"客厅远征",   emoji:"🛋️", rows:16, cols:16, mines:75 },
  { id:14, name:"地砖迷宫",   emoji:"🧱", rows:16, cols:18, mines:85 },
  { id:15, name:"阳台历险",   emoji:"🌿", rows:16, cols:20, mines:95 },
  { id:16, name:"公寓之主",   emoji:"🏢", rows:16, cols:22, mines:108},
  { id:17, name:"别墅初探",   emoji:"🏰", rows:16, cols:25, mines:122},
  { id:18, name:"大理石厅",   emoji:"💎", rows:16, cols:28, mines:138},
  { id:19, name:"花园深处",   emoji:"🌳", rows:16, cols:30, mines:155},
  { id:20, name:"如厕之王",   emoji:"👑", rows:16, cols:30, mines:170},
];

// ─── 场景章节（横幅配色 = 验收稿 ⑦ SCENES_MAP）───────────────────────────────
const CATEGORIES = [
  { label:"小号猫砂盆", emoji:"🥣", color:"#C9986B", range:[0,3]  },
  { label:"大号猫砂盆", emoji:"🛁", color:"#7FA9BB", range:[4,7]  },
  { label:"小房间",     emoji:"🚪", color:"#9C7A55", range:[8,11] },
  { label:"公寓",       emoji:"🏢", color:"#8A92A4", range:[12,15]},
  { label:"别墅",       emoji:"🏰", color:"#C9A227", range:[16,19]},
];

// ─── Select screen winding path layout（验收稿 ⑦：正弦蜿蜒 + 95px 节距）───────
// 底部=第1关向上攀升；x = 50% ± 21.8%（验收稿 nodeX = 165±72 / 330）
const _ND=56,_NR=28,_NH=95,_SUMMIT=210,_BP=110,_SEG=4*_NH+20;
const PATH_X=Array.from({length:20},(_,i)=>50+Math.sin(i*0.95)*21.8);
const _segTop=oi=>_SUMMIT+oi*_SEG;       // oi=0 是最顶上的别墅章节
// 关卡节点 Y（中心）：章节内关卡号越大越靠上（攀升方向）
function _nodeY(i){const ci=Math.floor(i/4),fromTop=3-(i-ci*4);return _segTop(4-ci)+78+fromTop*_NH;}
const _TOTAL_H=_segTop(4)+_SEG+_BP;
// 星级评定：基于最佳用时 vs 棋盘规模（节点下方 ⭐ 显示）
function starsFor(i,t){
  const lv=LEVELS[i],par=(lv.rows*lv.cols-lv.mines)*0.9;
  return t<=par*0.45?3:t<=par?2:1;
}

// ─── 文案（v2 · 猫咪第一人称）────────────────────────────────────────────────
const VICTORY_LINES = [
  "今天也是优雅的猫。","完美如厕，毛都没脏！","哼，这点小场面难不倒我","小盆已经装不下我的优雅了",
  "踮脚、落地、掩埋，一气呵成","我的鼻子从不说谎","大盆又怎样，照样优雅","这种密度……我可是职业的",
  "砂盆？我早就不需要砂盆了","木地板也挡不住我的优雅","毛线球都为我让路","独居猫咪的尊严，保住了！",
  "客厅是我的，厕所也是","如厕的艺术，懂？","阳台风很大，但我很稳","整个公寓都是我的厕所",
  "别墅之王指日可待🫡","大理石地板，配得上我","铲屎的回来肯定夸我","加冕吧！我就是如厕之王！",
];
const FAIL_LINES = [
  "呜……踩到自己拉的了","我的爪子！我的尊严！","刚才那格不该踩的……","没事，猫有九条命，再来",
];
const pickFailLine=()=>FAIL_LINES[Math.floor(Math.random()*FAIL_LINES.length)];

// ─── dev 调试参数：?phase=select 直达地图，?best=N 模拟前 N 关已通关 ─────────
const _qs=typeof location!=="undefined"?new URLSearchParams(location.search):null;
const _qPhase=_qs?.get("phase")||null;
const _qBest=Math.min(20,Math.max(0,parseInt(_qs?.get("best")||"0",10)||0));

// 初始阶段：首次进入（无 seenIntro）→ 故事动画；非首次 → 主视觉首页
const _initialPhase=(()=>{
  if(_qPhase==="select"||_qPhase==="intro"||_qPhase==="home")return _qPhase;
  try{return localStorage.getItem("seenIntro")?"home":"intro";}catch(e){return "home";}
})();

// ─── Tutorial levels (pre-baked boards, scripted hints) ──────────────────────
// Each cell: {mine, revealed, flagged, count}
// Tutorial teaches 3 concepts in order: read numbers → deduce safe → flag mines

function buildTutorialBoard(rows, cols, spec){
  // spec: array of {r,c,mine,revealed,flagged}
  const b = mkBoard(rows, cols);
  // place mines first
  spec.filter(s=>s.mine).forEach(s=>{ b[s.r][s.c].mine=true; });
  // compute counts
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(!b[r][c].mine){
    let n=0;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&b[nr][nc].mine) n++;
    }
    b[r][c].count=n;
  }
  // apply revealed/flagged
  spec.filter(s=>s.revealed).forEach(s=>{ b[s.r][s.c].revealed=true; });
  spec.filter(s=>s.flagged).forEach(s=>{ b[s.r][s.c].flagged=true; });
  return b;
}

// Tutorial 0: "认识数字" — 3×3, mine at (0,0), teaches what numbers mean.
// All safe cells pre-revealed except (2,2)=0. User clicks the one safe hidden cell.
// Board: [?][1][0] / [1][1][0] / [0][0][?←click here]
const TUT0 = {
  rows:3, cols:3, mines:1,
  label:"嗅出线索", emoji:"👃",
  spec:[
    {r:0,c:0,mine:true},
    {r:0,c:1,revealed:true},{r:0,c:2,revealed:true},
    {r:1,c:0,revealed:true},{r:1,c:1,revealed:true},{r:1,c:2,revealed:true},
    {r:2,c:0,revealed:true},{r:2,c:1,revealed:true},
  ],
  hints:[
    { trigger:"start",
      text:"我的鼻子告诉我：\n数字 = 旁边8格里埋着几坨💩\n「0」= 周围完全干净\n\n▶ 踩右下角那块干净砂地",
      highlight:[[2,2]], arrow:null },
    { trigger:"first_reveal",
      text:"✓ 踩对了！\n「0」说明周围一坨都没有\n我的鼻子从不说谎",
      highlight:[], arrow:null },
  ],
  correctFirst:[[2,2]],
};

// Tutorial 1: "做个记号" — 3×4, mine at (0,3), teaches flagging.
// Board: (0)(0)(1)[?mine] / (0)(0)(1)(1) / (0)(0)(0)[?safe←click]
// (0,2)=1 has only one hidden neighbor (0,3) → that must be the mine.
// After flagging (0,3), user clicks safe (2,3) to win.
const TUT1 = {
  rows:3, cols:4, mines:1,
  label:"做个记号", emoji:"🐾",
  spec:[
    {r:0,c:3,mine:true},
    {r:0,c:0,revealed:true},{r:0,c:1,revealed:true},{r:0,c:2,revealed:true},
    {r:1,c:0,revealed:true},{r:1,c:1,revealed:true},{r:1,c:2,revealed:true},{r:1,c:3,revealed:true},
    {r:2,c:0,revealed:true},{r:2,c:1,revealed:true},{r:2,c:2,revealed:true},
  ],
  hints:[
    { trigger:"start",
      text:"确定哪格埋着💩？用爪子做记号！\n右上「1」旁只剩1格没探过\n——那下面一定是💩\n\n切到 🚩 记号模式，标记它",
      highlight:[[0,2],[0,3]], arrow:null },
    { trigger:"flagged",
      text:"🐾 记号做好了，我记住了\n右下角是干净的\n切回 🐾 探砂，踩上去就成功了",
      highlight:[[2,3]], arrow:null },
  ],
  correctFirst:[[2,3]],
};

// Tutorial 2: "综合推理" — 3×5, mines at (2,0) and (2,4), combines everything.
// Board: (0)(0)(0)(0)(0) / (1)(1)(0)(1)(1) / [?mine](1)[?safe](1)[?mine]
// (1,0)=1 → only hidden neighbor is (2,0): mine. (1,4)=1 → (2,4): mine.
// Middle (2,2)=0 is safe. Flag both ends, then reveal center to win.
const TUT2 = {
  rows:3, cols:5, mines:2,
  label:"如厕的艺术", emoji:"⚡",
  spec:[
    {r:2,c:0,mine:true},{r:2,c:4,mine:true},
    {r:0,c:0,revealed:true},{r:0,c:1,revealed:true},{r:0,c:2,revealed:true},{r:0,c:3,revealed:true},{r:0,c:4,revealed:true},
    {r:1,c:0,revealed:true},{r:1,c:1,revealed:true},{r:1,c:2,revealed:true},{r:1,c:3,revealed:true},{r:1,c:4,revealed:true},
    {r:2,c:1,revealed:true},{r:2,c:3,revealed:true},
  ],
  hints:[
    { trigger:"start",
      text:"推理 + 记号 + 踮脚\n——这就是如厕的艺术！\n左边「1」旁只剩1格 → 那是💩，右边同理\n\n用 🚩 记号模式标记两坨💩",
      highlight:[[1,0],[2,0],[1,4],[2,4]], arrow:null },
    { trigger:"flagged",
      text:"🐾 再标记另一坨\n然后切回 🐾 探砂，踩中间那格\n优雅地完成这次如厕",
      highlight:[[2,2]], arrow:null },
  ],
  correctFirst:[[2,2]],
};

const TUTORIALS = [TUT0, TUT1, TUT2];

const NUM_COLOR = ["","#E8855A","#8DC87A","#E05A5A","#B8935A","#F2A7BB","#5A9EC8","#8B6355","#6B4226"];
const NUM_GLOW  = ["","rgba(232,133,90,.8)","rgba(141,200,122,.8)","rgba(224,90,90,.8)",
                   "rgba(184,147,90,.8)","rgba(242,167,187,.8)","rgba(90,158,200,.8)","rgba(139,99,85,.6)","rgba(107,66,38,.6)"];

// ─── 像素素材（移植自 asset-sprites.js 验收稿，已确认）────────────────────────
const PAL={k:"#5C4033",c:"#F6E7CD",d:"#E8D2AE",o:"#E8855A",p:"#F2A7BB",e:"#3E3128",w:"#FFFFFF",
  r:"#E05A5A",B:"#6B4226",m:"#8A5A2E",s:"#C9A96E",S:"#EDE0C4",t:"#A07848",y:"#F2C14E",g:"#8DC87A",u:"#A8D4E6"};
// 夜晚剪影配色（故事动画第1幕：黑暗中眼睛发光）
const SIL={k:"#1C1830",c:"#2B2438",d:"#2B2438",o:"#352C46",p:"#352C46",e:"#F2C14E",w:"#F2C14E"};
const SPR={
  catSit:[
    "....kk........kk....","...kcck......kcck...","...kcpck....kcpck...","..kkccckkkkkkccckk..",
    "..kcccccccccccccck..","..kcoccccccccccock..","k.kcceccccccccceck.k","k.kccccccppcccccck.k",
    "..kcccccckkcccccck..","...kcccccccccccck...","...kcccccccccccck...","...kccocccccoccck...",
    "...kcccccccccccck...","...kcccccccccccck...","...kcccccccccccckk..","...kccccccccccckok..",
    "...kcwccccccwcckok..","...kccccccccccckkk..","....kckkkkkkkkck....",".....kk......kk.....",
  ],
  // 踮爪小心（紧张专注：瞪大双眼 + 竖举尾巴 + 踮起的长腿 + 汗滴）
  catTiptoe:[
    "....kk........kk....","...kcck......kcck.u.","...kcpck....kcpck.u.","..kkccckkkkkkccckk..",
    "..kcccccccccccccck..","..kcoccccccccccock..","k.kcceeccccccceeck.k","k.kccccccppcccccck.k",
    "..kcccccckkcccccck..","...kcccccccccccck.k.","...kccocccccoccckkok","...kcccccccccccckkok",
    "...kcccccccccccckkok","...kkcckkkkkkcckk...","....kcck....kcck....","....kcck....kcck....",
    "....kcck....kcck....",".....kck....kck.....",".....kck....kck.....","......k......k......",
  ],
  // 惊吓（炸毛 + 巨大白眼 + 张嘴 + 双爪举起）
  catShock:[
    "..k...k....k...k....",".kkkk..........kkkk.",".kccck........kccck.","..kkcckkkkkkkkcckk..",
    "..kcccccccccccccck..","..kcwweccccccewwck..","..kcwweccccccewwck..","k.kcccccccccccccck.k",
    "..kcccceeeeeecccck..","..kcccceerreecccck..","..kccccceeeeccccck..","...kcccccccccccck...",
    "kcck.kcccccccck.kcck","kcck.kcccccccck.kcck",".kk..kccoccocck..kk.",".....kcccccccck.....",
    ".....kcccccccck.....",".....kkkkkkkkkk.....","......kk....kk......","....................",
  ],
  // 开心眯眼（通关：^_^ 眼 + 腮红 + 摇尾巴）
  catHappy:[
    "....kk........kk....","...kcck......kcck.p.","...kcpck....kcpck...","p.kkccckkkkkkccckk..",
    "..kcccccccccccccck..","..kceecccccccceeck..","..kppcccccccccppck..","k.kccccccppcccccck.k",
    "..kcccccekkeccccck..","...kcccccccccccck...","...kcccccccccccck...","...kccocccccoccck...",
    "...kcccccccccccck...","...kcccccccccccck...","...kcccccccccccck.k.","...kcccccccccccckok.",
    "...kcwccccccwccck.k.","...kcccccccccccck...","....kckkkkkkkkck....",".....kk......kk.....",
  ],
  poop:[
    "........",".....B..","....BB..","..BBBB..",".BmBBBB.",".BBBBmB.","BBBBBBBB","........",
  ],
  box:[
    "........................","kkkkkkkkkkkkkkkkkkkkkkkk","kttttttttttttttttttttttk","ktSSSSSSSSSSSSSSSSSSSStk",
    "ktSsSSSsSSSSsSSSsSSSSstk","ktsssssssssssssssssssstk","kttttttttttttttttttttttk","kkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  paw:[
    "........",".B.B.B..","..BBBB..",".BBBBBB.",".BBBBBB.","..BBBB..","........","........",
  ],
  yarn:[
    "...pppp...","..pppppp..",".ppprrppp.",".pprpprpp.",".ppprrppp.",".pprpprpp.","..pppppp..","...pppp...",".....r....","......rr..",
  ],
  tree:[
    "....gggg....","..gggggggg..",".gggggggggg.",".ggyggggygg.","..gggggggg..","...gggggg...",
    "....gggg....",".....tt.....",".....tt.....",".....tt.....","....tttt....","............",
  ],
  plant:[
    "....gg....","..gggggg..",".gggggggg.","..gggggg..","....gg....","....gg....","..tttttt..","..tttttt..","...tttt...","...tttt...",
  ],
  villa:[
    "............kk............","..........kkrrkk..........","........kkrrrrrrkk........","......kkrrrrrrrrrrkk......",
    "....kkrrrrrrrrrrrrrrkk....","....kcccccccccccccccck....","....kcyyccyyccyyccyyck....","....kcyyccyyccyyccyyck....",
    "....kcccccccccccccccck....","....kcccccccBBccccccck....","....kcccccccBBccccccck....","....kkkkkkkkkkkkkkkkkk....",
  ],
  iconStep:[
    "................","....cc.cc.cc....","....cc.cc.cc....","...cccccccccc...","...cccccccccc...","....cccccccc....",
    "................","....y..y..y.....",".kkkkkkkkkkkkkk.",".kttttttttttttk.",".ktSSSSSSSSSStk.",".ktsssssssssstk.",
    ".kkkkkkkkkkkkkk.","................","................","................",
  ],
  iconSniff:[
    "................","..kk.....kk.....",".kcck...kcck....",".kccckkkccck..y.",".kcccccccccck.y.",".kcecccccceck..y",
    ".kccccppcccck.y.",".kcccppppccck..y",".kcccppppccck.y.","..kcccccccck....","...kkkkkkkk.....","................",
    "................","................","................","................",
  ],
  iconTip:[
    "................",".....kcck.......",".....kcck.......",".....kcck.......","..y..kcck...y...",".....kcck.......",
    ".y...kcck....y..","....kcccck......","....kcccck......",".....kkkk.......","................","......ss........",
    "....ssssss......","..ssssssssss....","................","................",
  ],
  iconDig:[
    "................","....cc.cc.cc....","...cccccccccc...","...cccccccccc...","....cccccccc....","..y....y....y...",
    ".y...y....y....y","................","..ssssssssssss..",".ssssseeeesssss.",".sssseeeeeessss.",".ssssseeeesssss.",
    "..ssssssssssss..","................","................","................",
  ],
  iconBury:[
    "................","......y.........","....y.....y.....","..........w.....",".......BB.......","......BBBB......",
    ".....ssssss.....","....ssssssss....","...ssssssssss...","..ssssssssssss..",".ssssssssssssss.","ssssssssssssssss",
    "................","................","................","................",
  ],
  iconKing:[
    "....y.y..y.y....","....yyyyyyyy....","...kk......kk...","...kcck..kcck...","...kccckkccck...","...kcccccccck...",
    "...kcecccceck...","...kcccppccck...","....kcccccck....","..wwwwwwwwwwww..","..wwwwwwwwwwww..","...weeeeeeeew...",
    "...wwwwwwwwww...","....wwwwwwww....","...wwwwwwwwww...","................",
  ],
};
// ─── 成长体系：6 级 =「猫如厕仪式六部曲」（配色/文案与验收稿 ④ 完全一致）──────
const RANKS=[
  { title:"踏砂小猫", icon:"iconStep",  color:"#8DC87A", cond:"肉垫踏进砂盆 · 初始",   ceremony:"初始获得 · 第一次踏进猫砂盆" },
  { title:"嗅嗅小猫", icon:"iconSniff", color:"#A8D4E6", cond:"粉鼻嗅线索 · 通关4关", ceremony:"通关第 4 关 · 鼻子嗅出线索" },
  { title:"踮爪小猫", icon:"iconTip",   color:"#F2A7BB", cond:"单爪踮砂尖 · 通关8关", ceremony:"通关第 8 关 · 踮爪避开便便" },
  { title:"刨坑小猫", icon:"iconDig",   color:"#7FA9BB", cond:"爪刨砂坑 · 通关12关",  ceremony:"通关第 12 关 · 刨出完美砂坑" },
  { title:"埋宝小猫", icon:"iconBury",  color:"#8B6355", cond:"砂丘埋宝 · 通关16关",  ceremony:"通关第 16 关 · 掩埋滴水不漏" },
  { title:"如厕之王", icon:"iconKing",  color:"linear-gradient(135deg,#F2C14E,#E8855A)", flat:"#F2C14E", final:true,
    cond:"加冕马桶王座 · 通关20关", ceremony:"通关全部 20 关 · 加冕白瓷王座" },
];
// 等级达成判定：Lv.1 初始即有；Lv.r 需通关第 r*4 关（即 bestTimes[r*4-1]）
const rankEarned=(r,bestTimes)=>r===0||bestTimes[r*4-1]!==null;
const currentRank=bestTimes=>{let r=0;for(let i=1;i<RANKS.length;i++)if(rankEarned(i,bestTimes))r=i;return r;};

// 八角形像素勋章（验收稿 ④ .medal：深棕描边 + 左上高光，未解锁=灰阶剪影+🔒）
function MedalBadge({rank,earned,size=76}){
  const rk=RANKS[rank];
  return(
    <div style={{
      width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",
      clipPath:"polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)",
      background:rk.color,
      border:`3px solid ${rk.final?"#B8860B":"#5C4033"}`,
      boxShadow:rk.final&&earned
        ?"inset 3px 3px 0 rgba(255,255,255,.5), inset -3px -3px 0 rgba(0,0,0,.15), 0 0 14px 3px rgba(242,193,78,.6)"
        :"inset 3px 3px 0 rgba(255,255,255,.35), inset -3px -3px 0 rgba(0,0,0,.15)",
      filter:earned?"none":"grayscale(1) brightness(.85)",
      opacity:earned?1:.55,flexShrink:0,
    }}>
      <Sprite map={SPR[rk.icon]} scale={Math.max(2,Math.round(size/19))}/>
      {!earned&&<span style={{position:"absolute",fontSize:Math.round(size*.29)}}>🔒</span>}
    </div>
  );
}
// 迷你勋章（验收稿 ⑦ .minimedal：章节横幅前缀 / 节点角标共用）
function MiniMedal({rank,size=22,gray=false}){
  const rk=RANKS[rank];
  return(
    <span style={{
      width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",
      background:gray?"#BCB1A0":(rk.flat||rk.color),
      clipPath:"polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)",
      boxShadow:"inset 0 0 0 2px #5C4033, inset 2px 2px 0 rgba(255,255,255,.3)",
      flexShrink:0,filter:gray?"grayscale(1)":"none",
    }}>
      <Sprite map={SPR[rk.icon]} scale={1} gray={gray?"#8A8174":null}/>
    </span>
  );
}

// ─── 棋盘场景换肤（v2 · 完全参照 asset-preview.html ⑤ 已确认验收稿）──────────
// 每场景：page=页面背景 / tray=外框造型 / 结构件开关（握把/顶罩/墙面/窗排/屋顶/栏杆/树篱）
// 格子：多层砂粒噪点（spkL/spkD）+ 渐变（ca→cb），翻开格带耙砂纹（dug）
const SCENE_SKIN=[
  { // sk1 🥣 小号猫砂盆：圆角塑料浅盆 + 盆沿握把 + 盆脚
    page:{background:"#FDF6EC"},
    tray:{background:"#D9986B",border:"4px solid #C07A4E",borderRadius:"16px 16px 22px 22px",
      boxShadow:"inset 0 5px 0 rgba(255,255,255,.25), 0 5px 0 #A6663F"},
    handles:true,
    ca:"#D4BA7C",cb:"#B8935A",hi:"#DDBF82",lo:"#8A6030",dug:"#EDE0C4",spkL:"#E8D5A0",spkD:"#9A7840",
  },
  { // sk2 🛁 大号猫砂盆：带顶罩 + 入口拱门（有小猫）
    page:{background:"#F2F8FA"},
    tray:{background:"#8BB7C7",border:"4px solid #6E9AAB",borderTop:"none",
      borderRadius:"0 0 20px 20px",boxShadow:"0 5px 0 #58818F"},
    hood:true,
    ca:"#DCC089",cb:"#C19A5F",hi:"#E8CD96",lo:"#8F6A35",dug:"#F0E3C6",spkL:"#EFDCA8",spkD:"#A07F45",
  },
  { // sk3 🚪 小房间：墙纸+窗户+相框+踢脚线，棋盘躺在木地板上
    page:{background:"repeating-linear-gradient(0deg,#C89B6A 0 14px,#B98955 14px 28px)"},
    tray:{background:"#9C7A55",border:"4px solid #6E4C40",borderRadius:6,
      boxShadow:"0 4px 0 #54382F"},
    wall:true,
    ca:"#CDB98E",cb:"#AE9468",hi:"#DCCBA2",lo:"#7E6740",dug:"#E9DEC2",spkL:"#E2D2A4",spkD:"#8C7344",
  },
  { // sk4 🏢 公寓：楼顶 + 亮灯窗户排 + 阳台栏杆
    page:{background:"conic-gradient(#EFE4D6 90deg,#E5D6C2 90deg 180deg,#EFE4D6 180deg 270deg,#E5D6C2 270deg) 0 0/28px 28px"},
    tray:{background:"#B8BFCC",border:"4px solid #7E8696",borderRadius:8,
      boxShadow:"0 4px 0 #5F6878"},
    winrow:true,rail:true,
    ca:"#C9B07E",cb:"#A78F5C",hi:"#D8C28D",lo:"#776438",dug:"#EBDFC4",spkL:"#DECB97",spkD:"#7E6A3D",
  },
  { // sk5 🏰 别墅：山形屋顶 + 烟囱 + 金柱 + 花园树篱
    page:{background:"linear-gradient(135deg,#F3EEE7 0 40%,#E8E0D4 40% 60%,#F3EEE7 60%)"},
    tray:{background:"linear-gradient(#F7EFDC,#EFE2C6)",border:"4px solid #C9A227",
      borderLeftWidth:8,borderRightWidth:8,
      boxShadow:"0 4px 0 #8F721A, 0 0 12px rgba(201,162,39,.45)"},
    roof:true,hedge:true,
    ca:"#D8BC86",cb:"#B89A5E",hi:"#E6CD97",lo:"#84693A",dug:"#F0E6CC",spkL:"#EBD8A4",spkD:"#8C7240",
  },
];
// 未翻开格：5 层砂粒噪点 + 渐变（验收稿 .skin .c）
const cellSandBg=s=>
  `radial-gradient(circle at 22% 28%, ${s.spkL} 0 1.6px, transparent 2.4px),`+
  `radial-gradient(circle at 68% 18%, ${s.spkD} 0 1.3px, transparent 2px),`+
  `radial-gradient(circle at 42% 64%, ${s.spkL} 0 1.4px, transparent 2.2px),`+
  `radial-gradient(circle at 82% 70%, ${s.spkD} 0 1.5px, transparent 2.3px),`+
  `radial-gradient(circle at 14% 80%, ${s.spkD} 0 1.1px, transparent 1.8px),`+
  `linear-gradient(135deg, ${s.ca}, ${s.cb})`;
// 翻开格：淡噪点 + 耙过的细砂纹（验收稿 .skin .c.dug）
const cellDugBg=s=>
  `radial-gradient(circle at 30% 40%, rgba(160,130,80,.18) 0 1px, transparent 1.6px),`+
  `radial-gradient(circle at 70% 60%, rgba(160,130,80,.14) 0 1px, transparent 1.6px),`+
  `repeating-linear-gradient(0deg, transparent 0 5px, rgba(160,130,80,.07) 5px 6px),`+
  `linear-gradient(${s.dug}, ${s.dug})`;

function Sprite({map,scale=3,gray=null,pal=null,style}){
  const w=map[0].length,h=map.length,rects=[];
  map.forEach((row,y)=>{
    for(let x=0;x<row.length;x++){
      const ch=row[x];if(ch===".")continue;
      rects.push(<rect key={y*32+x} x={x} y={y} width="1.05" height="1.05"
        fill={gray||(pal&&pal[ch])||PAL[ch]||"#000"}/>);
    }
  });
  return(
    <svg width={w*scale} height={h*scale} viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges" style={{display:"block",...style}}>{rects}</svg>
  );
}

// 像素云朵（Key Art .cloud：三块圆角矩形）
function Cloud({style,scale=1}){
  const s=v=>Math.round(v*scale);
  return(
    <div style={{position:"absolute",...style}}>
      <div style={{position:"relative",width:s(64),height:s(16)}}>
        <div style={{position:"absolute",inset:0,background:"#fff",borderRadius:3,opacity:.95}}/>
        <div style={{position:"absolute",width:s(30),height:s(14),top:-s(11),left:s(14),background:"#fff",borderRadius:3}}/>
        <div style={{position:"absolute",width:s(18),height:s(9),top:-s(7),left:s(42),background:"#fff",borderRadius:3}}/>
      </div>
    </div>
  );
}

// 木质招牌字幕（验收稿 ③ .cap：木纹渐变 + 钉子 + 白字棕影，与 Key Art 招牌同款）
function WoodSign({children,bottom=20,delay=".3s"}){
  return(
    <div style={{position:"absolute",bottom,left:18,right:18,textAlign:"center",
      background:"linear-gradient(#C89B6A,#B98955)",border:"3px solid #8B6355",borderRadius:10,
      padding:"10px 12px",boxShadow:"0 3px 0 rgba(107,66,38,.4)",
      animation:`fadeUp .6s ease both ${delay}`,zIndex:3}}>
      <div style={{position:"absolute",top:6,left:8,width:6,height:6,borderRadius:"50%",background:"#6B4226"}}/>
      <div style={{position:"absolute",top:6,right:8,width:6,height:6,borderRadius:"50%",background:"#6B4226"}}/>
      <div style={{color:"#fff",fontSize:14,lineHeight:1.7,letterSpacing:1,fontWeight:700,
        textShadow:"1px 1px 0 rgba(107,66,38,.65)"}}>
        {children}
      </div>
    </div>
  );
}
// 故事窗户（验收稿 ③ .swin：天空窗 + 十字框 + 窗外小云）
function Swin({style}){
  return(
    <div style={{position:"absolute",width:74,height:62,border:"5px solid #8B6355",
      background:"linear-gradient(#A8D4E6,#CBE6F2)",...style}}>
      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:4,background:"#8B6355",transform:"translateX(-50%)"}}/>
      <div style={{position:"absolute",top:"50%",left:0,right:0,height:4,background:"#8B6355",transform:"translateY(-50%)"}}/>
      <div style={{position:"absolute",top:8,left:7,width:24,height:7,background:"#fff",borderRadius:2,opacity:.9}}/>
    </div>
  );
}
// 故事动画每幕背景（验收稿 ③ s1-s4）
const INTRO_BG=[
  "linear-gradient(#3A3550, #5A4F6E 70%, #2E2A3E 100%)",
  "linear-gradient(#FDF6EC, #F4E3C8)",
  "linear-gradient(#FBEEDD, #F6DFC4)",
  "linear-gradient(#FDF6EC 55%, #E6CF9F 56%, #C9A96E)",
];

// ─── 关卡地图 · 5 章节整幅场景背景（验收稿 ⑦ sg1-sg5 精确值）─────────────────
const MAP_SEG=[
  { // sg1 砂地：颗粒 + 砂色渐变
    bg:{backgroundImage:"radial-gradient(circle at 18% 26%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 52% 68%, #B8935A 0 2px, transparent 3px),radial-gradient(circle at 82% 38%, #DDC592 0 2px, transparent 3px),linear-gradient(#F2E3C2, #E8D2A6)",
        backgroundSize:"58px 44px, 58px 44px, 58px 44px, 100% 100%"} },
  { // sg2 浴室格砖
    bg:{background:"conic-gradient(#EAF4F7 90deg,#DDEBF0 90deg 180deg,#EAF4F7 180deg 270deg,#DDEBF0 270deg) 0 0/26px 26px"} },
  { // sg3 房间墙纸
    bg:{background:"repeating-linear-gradient(90deg, #F6E7D2 0 18px, #F0DCC2 18px 36px)"} },
  { // sg4 公寓墙面
    bg:{backgroundImage:"repeating-linear-gradient(0deg, transparent 0 26px, rgba(95,104,120,.14) 26px 29px),repeating-linear-gradient(90deg, transparent 0 26px, rgba(95,104,120,.14) 26px 29px),linear-gradient(#E9E2D5,#E2D8C6)"} },
  { // sg5 别墅大理石
    bg:{background:"linear-gradient(115deg,#F4EFE6 0 28%, #EAE2D3 28% 33%, #F4EFE6 33% 62%, #ECE4D6 62% 68%, #F4EFE6 68%)"} },
];

// ─── board helpers ────────────────────────────────────────────────────────────
function mkBoard(rows,cols){
  return Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>
    ({r,c,mine:false,revealed:false,flagged:false,count:0})));
}
function placeMines(board,rows,cols,mines,sr,sc){
  const b=board.map(r=>r.map(c=>({...c})));
  let placed=0;
  while(placed<mines){
    const r=Math.floor(Math.random()*rows),c=Math.floor(Math.random()*cols);
    if(!b[r][c].mine&&!(r===sr&&c===sc)){b[r][c].mine=true;placed++;}
  }
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(!b[r][c].mine){
    let n=0;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&b[nr][nc].mine) n++;
    }
    b[r][c].count=n;
  }
  return b;
}
function floodReveal(board,r,c,rows,cols){
  const b=board.map(row=>row.map(cell=>({...cell})));
  const order=[],queue=[[r,c]],visited=new Set();
  while(queue.length){
    const[cr,cc]=queue.shift(),key=`${cr},${cc}`;
    if(visited.has(key)) continue; visited.add(key);
    if(cr<0||cr>=rows||cc<0||cc>=cols) continue;
    const cell=b[cr][cc];
    if(cell.revealed||cell.flagged||cell.mine) continue;
    cell.revealed=true;
    order.push({r:cr,c:cc,dist:Math.abs(cr-r)+Math.abs(cc-c)});
    if(cell.count===0) for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) queue.push([cr+dr,cc+dc]);
  }
  return{board:b,order};
}
function checkWin(board){return board.every(row=>row.every(cell=>cell.mine||cell.revealed));}

// ─── Audio ────────────────────────────────────────────────────────────────────
function createAudio(){
  const ctx=new(window.AudioContext||window.webkitAudioContext)();
  const G=(vol=.4)=>{const g=ctx.createGain();g.gain.value=vol;g.connect(ctx.destination);return g;};
  const noise=(dur,vol=.2,loCut=1200,hiCut=6000)=>{
    const sr=ctx.sampleRate,frames=Math.round(sr*dur);
    const buf=ctx.createBuffer(1,frames,sr),d=buf.getChannelData(0);
    for(let i=0;i<frames;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(frames*.5));
    const ns=ctx.createBufferSource();ns.buffer=buf;
    const lp=ctx.createBiquadFilter();lp.type="bandpass";lp.frequency.value=(loCut+hiCut)/2;lp.Q.value=.8;
    const e=ctx.createGain();ns.connect(lp);lp.connect(e);e.connect(G(vol));
    return{ns,e};
  };

  // 铲砂声 — short sand "shhk"
  function playClick(){
    const t=ctx.currentTime,{ns,e}=noise(.08,.12,800,4000);
    e.gain.setValueAtTime(.6,t);e.gain.exponentialRampToValueAtTime(.001,t+.08);
    ns.start(t);ns.stop(t+.1);
  }
  // 铲开提示音 — soft sand scoop with a tiny pitch hint
  function playReveal(count=0){
    const t=ctx.currentTime;
    const{ns,e}=noise(.12,.14,1200+count*200,5000+count*300);
    e.gain.setValueAtTime(.5,t);e.gain.exponentialRampToValueAtTime(.001,t+.12);
    ns.start(t);ns.stop(t+.14);
    // tiny pitched note underneath — higher number = higher tone
    if(count>0){
      const freq=440+count*60,o=ctx.createOscillator(),oe=ctx.createGain();
      o.connect(oe);oe.connect(G(.07));o.type="sine";
      o.frequency.setValueAtTime(freq*.7,t);o.frequency.exponentialRampToValueAtTime(freq,t+.05);
      oe.gain.setValueAtTime(.35,t);oe.gain.exponentialRampToValueAtTime(.001,t+.1);
      o.start(t);o.stop(t+.12);
    }
  }
  // 大片铲开 — rushing sand cascade
  function playCascade(n){
    const t=ctx.currentTime,dur=Math.min(.55,.12+n*.02);
    const{ns,e}=noise(dur,.22,900,4500);
    e.gain.setValueAtTime(.25,t);e.gain.linearRampToValueAtTime(.65,t+.04);e.gain.exponentialRampToValueAtTime(.001,t+dur);
    ns.start(t);ns.stop(t+dur+.05);
    // rising whoosh
    const o=ctx.createOscillator(),oe=ctx.createGain();
    o.connect(oe);oe.connect(G(.09));o.type="sine";
    o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(500+n*6,t+dur*.75);
    oe.gain.setValueAtTime(.2,t);oe.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.start(t);o.stop(t+dur+.05);
  }
  // 标记便便 — cute bell ding 叮
  function playFlag(){
    const t=ctx.currentTime;
    [880,1760].forEach((f,i)=>{
      const o=ctx.createOscillator(),e=ctx.createGain();
      o.connect(e);e.connect(G(i===0?.22:.09));o.type="sine";
      o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.04,t+.02);
      e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(i===0?.55:.3,t+.01);
      e.gain.exponentialRampToValueAtTime(.001,t+(i===0?.45:.28));
      o.start(t);o.stop(t+(i===0?.48:.3));
    });
  }
  // 取消标记
  function playUnflag(){
    const t=ctx.currentTime,o=ctx.createOscillator(),e=ctx.createGain();
    o.connect(e);e.connect(G(.1));o.type="sine";
    o.frequency.setValueAtTime(660,t);o.frequency.exponentialRampToValueAtTime(330,t+.1);
    e.gain.setValueAtTime(.3,t);e.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.13);
  }
  // 踩到便便 — silly "噗" fart sound
  function playExplosion(){
    const t=ctx.currentTime;
    // main "噗" — low oscillator plummeting + air puff
    const o=ctx.createOscillator(),oe=ctx.createGain();
    o.connect(oe);oe.connect(G(.55));o.type="sine";
    o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(38,t+.38);
    oe.gain.setValueAtTime(.9,t);oe.gain.setValueAtTime(.9,t+.04);oe.gain.exponentialRampToValueAtTime(.001,t+.42);
    o.start(t);o.stop(t+.45);
    // sputtery harmonics
    [0,.05,.11,.19].forEach(dt=>{
      const o2=ctx.createOscillator(),e2=ctx.createGain();
      o2.connect(e2);e2.connect(G(.18));o2.type="square";
      o2.frequency.setValueAtTime(130-dt*60,t+dt);o2.frequency.exponentialRampToValueAtTime(22,t+dt+.18);
      e2.gain.setValueAtTime(.45,t+dt);e2.gain.exponentialRampToValueAtTime(.001,t+dt+.22);
      o2.start(t+dt);o2.stop(t+dt+.25);
    });
    // air rush noise
    const{ns,e}=noise(.3,.28,200,900);
    e.gain.setValueAtTime(.7,t);e.gain.exponentialRampToValueAtTime(.001,t+.38);
    ns.start(t);ns.stop(t+.42);
  }
  // 猫咪嘶嘶 — cat hiss (still upset)
  function playRumble(){
    const t=ctx.currentTime;
    const o=ctx.createOscillator(),e=ctx.createGain();
    o.connect(e);e.connect(G(.14));o.type="sawtooth";
    o.frequency.setValueAtTime(420,t+.25);o.frequency.exponentialRampToValueAtTime(180,t+.9);
    e.gain.setValueAtTime(0,t+.25);e.gain.linearRampToValueAtTime(.28,t+.35);
    e.gain.exponentialRampToValueAtTime(.001,t+1);o.start(t+.25);o.stop(t+1.05);
    // hiss breath
    const{ns:ns2,e:he}=noise(.6,.1,2500,8000);
    he.gain.setValueAtTime(.4,t+.3);he.gain.exponentialRampToValueAtTime(.001,t+.9);
    ns2.start(t+.3);ns2.stop(t+1);
  }
  // 通关！— happy meow + ascending pentatonic
  function playLevelUp(){
    const t=ctx.currentTime;
    // short happy meow
    const vib=ctx.createOscillator(),vg=ctx.createGain();
    vib.type="sine";vib.frequency.value=7;vib.connect(vg);vg.gain.value=18;
    const m=ctx.createOscillator(),me=ctx.createGain();
    vg.connect(m.frequency);m.connect(me);me.connect(G(.22));m.type="triangle";
    m.frequency.setValueAtTime(380,t);m.frequency.exponentialRampToValueAtTime(600,t+.1);m.frequency.exponentialRampToValueAtTime(520,t+.22);
    me.gain.setValueAtTime(0,t);me.gain.linearRampToValueAtTime(.5,t+.04);me.gain.exponentialRampToValueAtTime(.001,t+.28);
    vib.start(t);vib.stop(t+.3);m.start(t);m.stop(t+.3);
    // playful ascending scale (pentatonic — C D E G A C)
    [523,587,659,784,880,1047].forEach((f,i)=>{
      const o=ctx.createOscillator(),e=ctx.createGain();o.connect(e);e.connect(G(.2));
      o.type="triangle";o.frequency.value=f;const st=t+.18+i*.09;
      e.gain.setValueAtTime(0,st);e.gain.linearRampToValueAtTime(.45,st+.02);e.gain.exponentialRampToValueAtTime(.001,st+.42);
      o.start(st);o.stop(st+.44);
    });
    // warm sustain chord
    [523,659,784].forEach(f=>{
      const o=ctx.createOscillator(),e=ctx.createGain();o.connect(e);e.connect(G(.1));
      o.type="sine";o.frequency.value=f;const st=t+.75;
      e.gain.setValueAtTime(0,st);e.gain.linearRampToValueAtTime(.25,st+.06);e.gain.exponentialRampToValueAtTime(.001,st+1.9);
      o.start(st);o.stop(st+2);
    });
  }
  function playCombo(n){
    const freqs=[523,659,784,1047,1319],t=ctx.currentTime;
    freqs.slice(0,Math.min(n,5)).forEach((f,i)=>{
      const o=ctx.createOscillator(),e=ctx.createGain();o.connect(e);e.connect(G(.1));
      o.type="sine";o.frequency.value=f;const st=t+i*.07;
      e.gain.setValueAtTime(.35,st);e.gain.exponentialRampToValueAtTime(.001,st+.28);o.start(st);o.stop(st+.3);
    });
  }
  function playTick(){
    const t=ctx.currentTime,o=ctx.createOscillator(),e=ctx.createGain();
    o.connect(e);e.connect(G(.04));o.type="sine";o.frequency.value=1100;
    e.gain.setValueAtTime(.1,t);e.gain.exponentialRampToValueAtTime(.001,t+.03);o.start(t);o.stop(t+.04);
  }

  // ── 猫咪叫声体系（v2）：真实猫叫素材优先，合成喵兜底 ──
  // 素材：Mixkit 免费音效（Mixkit License，免署名可用于游戏），public/sounds/
  // 音量 ≤ 操作音效；同一时刻只播一个喵声（后到打断先到）；rate 微调情绪
  let meowStop=null;
  const MEOW_FILES={
    enter:    "sounds/meow-enter.mp3",     // Sweet kitty meow → 进关元气短喵
    cascade:  "sounds/meow-cascade.mp3",   // Cartoon kitty begging meow → 连开兴奋双音节
    milestone:"sounds/purr-milestone.mp3", // Big wild cat long purr → 里程碑呼噜
    whine:    "sounds/meow-whine.mp3",     // Little cat pain meow → 踩屎哀怨喵
    rankup:   "sounds/meow-rankup.mp3",    // Little cat attention meow → 颁章庄重喵
    retry:    "sounds/meow-retry.mp3",     // Cartoon little cat meow → 重试振作短喵
    shock:    "sounds/meow-shock.mp3",     // Angry cartoon kitty meow → 踩屎惊叫
  };
  const MEOW_PLAY={
    enter:{vol:.3,rate:1},cascade:{vol:.28,rate:1.06},milestone:{vol:.18,rate:1},
    whine:{vol:.34,rate:.88},rankup:{vol:.32,rate:.95},retry:{vol:.26,rate:1.12},
    shock:{vol:.4,rate:1},
  };
  const meowBufs={};
  Object.entries(MEOW_FILES).forEach(([k,url])=>{
    fetch(url).then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error(String(r.status))))
      .then(ab=>ctx.decodeAudioData(ab))
      .then(buf=>{meowBufs[k]=buf;})
      .catch(()=>{/* 加载失败 → playMeow 自动回退合成喵 */});
  });
  // 合成兜底（参数同上一版）
  const MEOWS={
    enter:    {dur:.25,vol:.15,curve:[[0,600],[.12,900],[.25,780]]},
    cascade:  {dur:.42,vol:.14,curve:[[0,520],[.08,760],[.16,560],[.24,660],[.34,940],[.42,820]]},
    milestone:{dur:.5, vol:.11,curve:[[0,640],[.1,560],[.3,470],[.5,410]]},
    whine:    {dur:.8, vol:.17,curve:[[0,700],[.15,620],[.45,420],[.8,255]],vib:15},
    rankup:   {dur:.9, vol:.17,curve:[[0,420],[.2,640],[.5,580],[.9,495]]},
    retry:    {dur:.22,vol:.13,curve:[[0,300],[.08,430],[.22,380]]},
    shock:    {dur:.85,vol:.2, curve:[[0,320],[.14,680],[.75,210]],vib:25},
  };
  function playMeow(type){
    if(meowStop){try{meowStop();}catch(e){/* already stopped */}meowStop=null;}
    // 真实素材路径
    const buf=meowBufs[type];
    if(buf){
      const pp=MEOW_PLAY[type]||{vol:.3,rate:1};
      const src=ctx.createBufferSource(),be=ctx.createGain();
      src.buffer=buf;src.playbackRate.value=pp.rate;
      src.connect(be);be.connect(G(pp.vol));
      const t0=ctx.currentTime;
      be.gain.setValueAtTime(1,t0);
      src.start(t0);
      if(type==="rankup"){ // 钟声泛音叠加
        [1320,2640].forEach((f,i)=>{
          const b=ctx.createOscillator(),e2=ctx.createGain();
          b.connect(e2);e2.connect(G(i===0?.1:.05));b.type="sine";b.frequency.value=f;
          e2.gain.setValueAtTime(0,t0+.15);e2.gain.linearRampToValueAtTime(.5,t0+.17);
          e2.gain.exponentialRampToValueAtTime(.001,t0+1.1);b.start(t0+.15);b.stop(t0+1.15);
        });
      }
      meowStop=()=>{
        const n=ctx.currentTime;
        be.gain.setTargetAtTime(.0001,n,.025);
        try{src.stop(n+.1);}catch(e2){/* already ended */}
      };
      return;
    }
    // —— 合成兜底 ——
    const p=MEOWS[type];if(!p)return;
    const t=ctx.currentTime;
    const vib=ctx.createOscillator(),vg=ctx.createGain();
    vib.type="sine";vib.frequency.value=7;vg.gain.value=p.vib||18;vib.connect(vg);
    const o=ctx.createOscillator(),e=ctx.createGain();
    vg.connect(o.frequency);o.connect(e);e.connect(G(p.vol));o.type="triangle";
    p.curve.forEach(([dt,f],i)=>{
      if(i===0)o.frequency.setValueAtTime(f,t+dt);
      else o.frequency.exponentialRampToValueAtTime(f,t+dt);
    });
    e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(1,t+.04);
    e.gain.setValueAtTime(1,t+p.dur*.6);e.gain.exponentialRampToValueAtTime(.001,t+p.dur+.05);
    vib.start(t);vib.stop(t+p.dur+.12);o.start(t);o.stop(t+p.dur+.12);
    if(type==="rankup"){ // 钟声泛音
      [1320,2640].forEach((f,i)=>{
        const b=ctx.createOscillator(),be=ctx.createGain();
        b.connect(be);be.connect(G(i===0?.1:.05));b.type="sine";b.frequency.value=f;
        be.gain.setValueAtTime(0,t+.15);be.gain.linearRampToValueAtTime(.5,t+.17);
        be.gain.exponentialRampToValueAtTime(.001,t+1.1);b.start(t+.15);b.stop(t+1.15);
      });
    }
    meowStop=()=>{
      const n=ctx.currentTime;
      e.gain.cancelScheduledValues(n);e.gain.setValueAtTime(Math.max(e.gain.value,.001),n);
      e.gain.exponentialRampToValueAtTime(.001,n+.04);
      o.stop(n+.06);vib.stop(n+.06);
    };
  }

  return{playClick,playReveal,playCascade,playFlag,playUnflag,
         playExplosion,playRumble,playLevelUp,playCombo,playTick,playMeow,
         resume:()=>ctx.resume()};
}

// ─── particles ────────────────────────────────────────────────────────────────
let pid=0;
const mkP=(x,y,vx,vy,r,color,decay,gravity=.3,shape="circle",glow=0,outline="")=>
  ({id:pid++,x,y,vx,vy,r,color,decay,gravity,life:1,shape,glow,outline,px:x,py:y});

function mkStrand(ox,oy,vx,vy,color,width,trailLen=18){
  return{id:pid++,x:ox,y:oy,vx,vy,
    history:Array.from({length:trailLen},()=>({x:ox,y:oy})),trailLen,
    color,width,life:1,decay:.012+Math.random()*.006,gravity:.13,friction:.985,shape:"strand"};
}
function firework(x,y){
  const schemes=[
    ["#FF2D00","#FF8C00","#FFD600"],["#00C8FF","#00FFD0","#fff"],
    ["#FF00CC","#FF6BFF","#FFD600"],["#00FF44","#AAFF00","#FFD600"],
    ["#A020F0","#FF00CC","#fff"],["#FF6B00","#FFD600","#fff"],
  ];
  const pal=schemes[Math.floor(Math.random()*schemes.length)];
  const out=[],n=22+Math.floor(Math.random()*10);
  for(let i=0;i<n;i++){
    const ang=(i/n)*Math.PI*2+(Math.random()-.5)*.25,spd=14+Math.random()*10;
    out.push(mkStrand(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,
      pal[Math.floor(Math.random()*pal.length)],2.5+Math.random()*2.5,14+Math.floor(Math.random()*12)));
  }
  for(let i=0;i<6;i++){
    const ang=Math.random()*Math.PI*2,spd=5+Math.random()*6;
    out.push(mkStrand(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,"#fff",3.5,8));
  }
  return out;
}
function ring(x,y,n,palette){
  return Array.from({length:n},(_,i)=>{
    const ang=(i/n)*Math.PI*2,spd=(Math.random()*.4+.8)*7;
    return mkP(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,
      Math.random()*5+3,palette[Math.floor(Math.random()*palette.length)],
      Math.random()*.025+.015,.05,"comicStar",0,"#111");
  });
}
function burst(x,y,n,palette,spd=1,gravity=.3){
  return Array.from({length:n},()=>{
    const ang=Math.random()*Math.PI*2,s=(Math.random()*.6+.4)*spd*10;
    return mkP(x,y,Math.cos(ang)*s,(Math.sin(ang)-.4)*s,
      Math.random()*5+3,palette[Math.floor(Math.random()*palette.length)],
      Math.random()*.02+.01,gravity,"circle",0,"");
  });
}
// warm brown "poop cloud" puff — replaces black smoke
function poopCloud(x,y,n=12,spread=110){
  const cols=["#9B7040","#B8935A","#8B6035","#A07848","#7A5028","#C4A070"];
  return Array.from({length:n},()=>{
    const angle=Math.random()*Math.PI*2,spawnDist=spread*.25+Math.random()*spread*.65;
    return{id:pid++,x:x+Math.cos(angle)*spawnDist,y:y+Math.sin(angle)*spawnDist*.5-spread*.15,
      vx:Math.cos(angle)*(Math.random()*1.8+.4),vy:-(Math.random()*1.6+.4),
      r:Math.random()*50+28,color:cols[Math.floor(Math.random()*cols.length)],
      rgb:null,decay:Math.random()*.0022+.0012,gravity:-.028,life:1,shape:"smoke",glow:0,outline:""};
  });
}
// warm brown splat dots — replaces dark debris
function poopSplat(x,y,n=22){
  const pal=["#6B4226","#8B5E3C","#5A341A","#A07848","#7A4F2E","#C4956A"];
  return Array.from({length:n},()=>{
    const ang=Math.random()*Math.PI*2,spd=(Math.random()*.6+.4)*11;
    return mkP(x,y,Math.cos(ang)*spd,(Math.sin(ang)-.3)*spd,
      Math.random()*7+3,pal[Math.floor(Math.random()*pal.length)],
      Math.random()*.016+.009,.45,"circle",0,"");
  });
}
// warm brown burst — replaces orange embers
function poopParticles(x,y,n=55){
  const pal=["#6B4226","#8B5E3C","#A07848","#5A341A","#C4956A","#7A4F2E","#B8935A"];
  return Array.from({length:n},()=>{
    const ang=Math.random()*Math.PI*2,spd=(Math.random()*.6+.4)*13;
    return mkP(x,y,Math.cos(ang)*spd,(Math.sin(ang)-0.9)*spd,
      Math.random()*5+2,pal[Math.floor(Math.random()*pal.length)],
      Math.random()*.022+.012,.32,"circle",0,"");
  });
}
// wavy stink puffs rising upward — replaces ember drift
function stinkRise(x,y,n=10,spread=100){
  const cols=["rgba(139,96,53,.55)","rgba(160,120,72,.45)","rgba(107,66,38,.5)","rgba(184,147,90,.4)"];
  return Array.from({length:n},()=>({
    id:pid++,x:x+(Math.random()-.5)*spread,y:y+(Math.random()-.5)*(spread*.3),
    vx:(Math.random()-.5)*1.2,vy:-(Math.random()*2+1),r:Math.random()*18+10,
    color:cols[Math.floor(Math.random()*cols.length)],rgb:null,decay:Math.random()*.005+.003,
    gravity:-.022,life:1,shape:"smoke",glow:0,outline:"",
  }));
}
// tiny sand micro-particles on cell reveal
function sandSplash(x,y,n=4){
  const pal=["#D4BA7C","#C9A96E","#E8D4A0","#B8935A","#DFC89A"];
  return Array.from({length:n},()=>{
    const ang=Math.random()*Math.PI*2,spd=(Math.random()*.4+.3)*6;
    return mkP(x,y,Math.cos(ang)*spd,(Math.sin(ang)-0.6)*spd,
      Math.random()*2.5+1,pal[Math.floor(Math.random()*pal.length)],
      .04+Math.random()*.025,.25,"circle",0,"");
  });
}
// emoji particle helper
const mkPE=(x,y,vx,vy,r,text,decay,gravity=.1)=>
  ({id:pid++,x,y,vx,vy,r,color:"#fff",text,decay,gravity,life:1,shape:"emoji",glow:0,outline:""});
// hearts + sparkles for win celebration
function heartFirework(x,y){
  const texts=["💕","💗","💖","🌸","✨","🌟"];
  const out=[],n=14+Math.floor(Math.random()*6);
  for(let i=0;i<n;i++){
    const ang=(i/n)*Math.PI*2+(Math.random()-.5)*.4,spd=9+Math.random()*9;
    out.push(mkPE(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,
      11+Math.random()*7,texts[Math.floor(Math.random()*texts.length)],
      .014+Math.random()*.007,.1));
  }
  return out;
}
// paw prints + sparkles for win celebration
function pawFirework(x,y){
  const texts=["🐾","🐾","🐾","✨","💛","🌼"];
  const out=[],n=13+Math.floor(Math.random()*5);
  for(let i=0;i<n;i++){
    const ang=(i/n)*Math.PI*2+(Math.random()-.5)*.4,spd=8+Math.random()*8;
    out.push(mkPE(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,
      10+Math.random()*6,texts[Math.floor(Math.random()*texts.length)],
      .013+Math.random()*.006,.1));
  }
  return out;
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Minesweeper(){
  const [phase,setPhase]       = useState(_initialPhase); // "intro" | "home" | "select" | "tutorial" | "game"
  const [introScene,setIntroScene]=useState(               // 故事动画当前幕 0-3（dev: &scene=N 直达）
    _qPhase==="intro"?Math.min(3,Math.max(0,parseInt(_qs?.get("scene")||"0",10)||0)):0);
  const introBackRef=useRef("tutorial");                    // intro 结束去向：首次→教学，重看→首页
  const [tutIdx,setTutIdx]     = useState(0);          // 0-2 tutorial steps
  const [tutHint,setTutHint]   = useState(0);          // which hint within tutorial
  const [tutHighlight,setTutHL]= useState([]);          // cells to highlight
  const [levelIdx,setLevelIdx] = useState(0);          // 0-19
  const [board,setBoard]       = useState(()=>mkBoard(5,5));
  const [gs,setGs]             = useState("idle");     // idle playing won lost
  const [mLeft,setMLeft]       = useState(3);
  const [time,setTime]         = useState(0);
  const [firstClick,setFC]     = useState(true);
  const [ripple,setRipple]     = useState({});
  const [numPop,setNumPop]     = useState(new Set());
  const [flagAnim,setFlagAnim] = useState(new Set());
  const [shakeBoard,setShake]  = useState(false);
  const [combo,setCombo]           = useState(0);
  const [comboFlash,setCFlash]     = useState(false);
  const [milestones,setMilestones] = useState(new Set()); // which % milestones fired this level
  const [lostCell,setLostCell] = useState(null);
  const [lostLine,setLostLine] = useState(FAIL_LINES[0]);
  const [lockShake,setLockShake]=useState(-1);   // 被点击的未解锁节点（抖动反馈）
  const [shakeSeq,setShakeSeq] = useState(0);     // 抖动重触发序号
  const [lockTip,setLockTip]   = useState(false); // 「还没到这里哦」提示
  const [showRankUp,setShowRankUp]=useState(       // 升级仪式：新等级索引 1-5（dev: &rankup=N）
    _qs?.get("rankup")?Math.min(5,Math.max(1,parseInt(_qs.get("rankup"),10)||1)):null);
  const [showMedals,setShowMedals]=useState(!!_qs?.get("medals")); // 勋章墙（dev: &medals=1）
  const [muted,setMuted]       = useState(false);
  const [flagMode,setFlagMode] = useState(false);
  const [showLevelUp,setShowLU]= useState(false); // level-up splash
  const [bestTimes,setBestTimes]= useState(()=>{
    if(_qBest>0)return Array.from({length:20},(_,i)=>i<_qBest?42+i:null);
    try{const s=localStorage.getItem("minesweeper_best");if(s)return JSON.parse(s);}catch(_){}
    return Array(20).fill(null);
  });

  const canvasRef       = useRef(null);
  const boardRef        = useRef(null);
  const frameRef        = useRef(null); // 固定比例游戏视口（390:844）
  const selectScrollRef = useRef(null);
  const particles = useRef([]);
  const rafRef    = useRef(null);
  const shockwaves= useRef([]);
  const audioRef  = useRef(null);
  const mutedRef  = useRef(false);
  const lpRef     = useRef(null);

  // lv used only for display in game phase (level name, emoji etc.)
  const lv = LEVELS[levelIdx];
  // rows/cols/mines derived from activeLv (tutorial or game) — set later before render

  // Active level dimensions — used throughout (must be before handlers)
  // phase/tutIdx/levelIdx available here since they're state
  const _activeLv = phase==="tutorial" ? TUTORIALS[tutIdx] : LEVELS[levelIdx];
  const rows=_activeLv.rows, cols=_activeLv.cols, mines=_activeLv.mines;

  const initAudio=()=>{
    if(audioRef.current){audioRef.current.resume();return;}
    audioRef.current=createAudio();
  };
  const snd=(fn,...args)=>{if(mutedRef.current||!audioRef.current)return;audioRef.current[fn]?.(...args);};
  useEffect(()=>{mutedRef.current=muted;},[muted]);

  // ── canvas loop ───────────────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;};
    resize();window.addEventListener("resize",resize);
    function drawComicStar(ctx,x,y,r){
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2,ri=i%2===0?r:r*.42;
        i===0?ctx.moveTo(x+Math.cos(a)*ri,y+Math.sin(a)*ri):ctx.lineTo(x+Math.cos(a)*ri,y+Math.sin(a)*ri);
      }
      ctx.closePath();
    }
    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      shockwaves.current=shockwaves.current.filter(sw=>{
        sw.r+=10;sw.life-=.045;if(sw.life<=0)return false;
        ctx.save();ctx.globalAlpha=sw.life;
        ctx.strokeStyle="#111";ctx.lineWidth=sw.life*10+3;
        ctx.beginPath();ctx.arc(sw.x,sw.y,sw.r,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle=sw.color;ctx.lineWidth=sw.life*7;
        ctx.beginPath();ctx.arc(sw.x,sw.y,sw.r,0,Math.PI*2);ctx.stroke();
        ctx.restore();return true;
      });
      particles.current=particles.current.filter(p=>{
        if(p.shape==="strand"){
          p.history.push({x:p.x,y:p.y});
          if(p.history.length>p.trailLen)p.history.shift();
          p.vx*=p.friction;p.vy*=p.friction;p.vy+=p.gravity;
          p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;
          if(p.life<=0||p.history.length<2)return false;
          ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
          const h=p.history,n=h.length;
          for(let i=1;i<n;i++){
            const t=i/(n-1),alpha=p.life*t*t,lw=p.width*t*p.life;
            if(lw<.3||alpha<.02)continue;
            ctx.globalAlpha=alpha;ctx.strokeStyle=p.color;ctx.lineWidth=lw;
            ctx.beginPath();ctx.moveTo(h[i-1].x,h[i-1].y);
            if(i<n-1){const mx=(h[i].x+h[i+1].x)/2,my=(h[i].y+h[i+1].y)/2;ctx.quadraticCurveTo(h[i].x,h[i].y,mx,my);}
            else ctx.lineTo(h[i].x,h[i].y);
            ctx.stroke();
          }
          ctx.globalAlpha=p.life;ctx.fillStyle="#fff";
          ctx.beginPath();ctx.arc(p.x,p.y,p.width*.9,0,Math.PI*2);ctx.fill();
          ctx.restore();return true;
        }
        p.px=p.x;p.py=p.y;
        p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.vx*=.97;p.life-=p.decay;
        if(p.life<=0)return false;
        ctx.save();ctx.globalAlpha=p.life;
        if(p.shape==="comicStar"){
          const r=p.r*p.life;
          if(p.outline){ctx.fillStyle=p.outline;drawComicStar(ctx,p.x,p.y,r+2.5);ctx.fill();}
          ctx.fillStyle=p.color;drawComicStar(ctx,p.x,p.y,r);ctx.fill();
        } else if(p.shape==="smoke"){
          ctx.globalAlpha=p.life*.88;ctx.fillStyle=p.color;
          const rr=p.r*.9;
          ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(p.x+rr*.35,p.y-rr*.25,rr*.7,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(p.x-rr*.3,p.y-rr*.2,rr*.65,0,Math.PI*2);ctx.fill();
        } else if(p.shape==="emoji"){
          ctx.globalAlpha=Math.min(1,p.life*1.2);
          ctx.font=`${Math.round(p.r*2)}px sans-serif`;
          ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.fillText(p.text||"✨",p.x,p.y);
        } else {
          ctx.fillStyle=p.color;
          ctx.beginPath();ctx.arc(p.x,p.y,Math.max(p.r*p.life,1),0,Math.PI*2);ctx.fill();
        }
        ctx.restore();return true;
      });
      rafRef.current=requestAnimationFrame(tick);
    }
    rafRef.current=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resize);};
  },[]);

  // phase starts as "home" — no auto-start needed
  // dev 调试：?phase=game&lv=N / ?phase=tutorial&tut=N 直达对应界面
  useEffect(()=>{
    if(_qPhase==="game"){
      const i=Math.min(19,Math.max(0,parseInt(_qs?.get("lv")||"0",10)||0));
      setPhase("game");setLevelIdx(i);startLevel(i);
    } else if(_qPhase==="tutorial"){
      startTutorial(Math.min(2,Math.max(0,parseInt(_qs?.get("tut")||"0",10)||0)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // scroll select path to current level when entering select screen
  useEffect(()=>{
    if(phase!=="select") return;
    const el=selectScrollRef.current;
    if(!el) return;
    const idx=bestTimes.findIndex(t=>t===null);
    const curIdx=idx===-1?19:idx;
    // 当前关位于屏幕中部偏下（拇指热区），向上可预览后续关卡
    const target=Math.max(0,Math.min(_nodeY(curIdx)-el.clientHeight*0.58,_TOTAL_H-el.clientHeight));
    el.scrollTop=target; // 瞬时定位，保证进入地图即看到当前关（拇指热区）
  },[phase]);

  // timer — only runs in game phase
  useEffect(()=>{
    let iv;
    if(gs==="playing"&&phase==="game")iv=setInterval(()=>{setTime(t=>t+1);snd("playTick");},1000);
    return()=>clearInterval(iv);
  },[gs,phase]);

  const addP=ps=>{particles.current=[...particles.current,...ps];};
  // 固定比例视口的屏幕矩形（粒子/烟花坐标一律以视口为基准）
  const frameRect=()=>frameRef.current?.getBoundingClientRect()
    ??{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
  const addSW=(x,y,color="#ff4444")=>{shockwaves.current=[...shockwaves.current,{x,y,r:10,life:1,color}];};
  const cellPx=(r,c)=>{
    if(!boardRef.current)return{x:0,y:0};
    const rect=boardRef.current.getBoundingClientRect();
    const cellW=rect.width/cols;
    const cellH=rect.height/rows;
    return{x:rect.left+c*cellW+cellW/2,y:rect.top+r*cellH+cellH/2};
  };

  // start or restart current level
  const startLevel=(idx)=>{
    const lv=LEVELS[idx];
    setBoard(mkBoard(lv.rows,lv.cols));
    setGs("idle");setMLeft(lv.mines);setTime(0);setFC(true);
    setRipple({});setNumPop(new Set());setFlagAnim(new Set());
    setShake(false);setCombo(0);setLostCell(null);setFlagMode(false);setMilestones(new Set());
    particles.current=[];shockwaves.current=[];
  };
  const retryLevel=()=>{startLevel(levelIdx);snd("playMeow","retry");};

  // 关卡地图节点点击：严格顺序解锁——未解锁节点抖动 + 提示，不可进入
  const enterLevel=i=>{initAudio();setPhase("game");setLevelIdx(i);startLevel(i);snd("playMeow","enter");};
  const tapNode=(i,unlocked)=>{
    if(unlocked){enterLevel(i);return;}
    initAudio();snd("playUnflag");
    setShakeSeq(s=>s+1); // 重复点击可再次触发抖动
    setLockShake(i);setLockTip(true);
    setTimeout(()=>{setLockShake(s=>s===i?-1:s);setLockTip(false);},1500);
  };

  // start a tutorial step
  const startTutorial=(idx)=>{
    const t=TUTORIALS[idx];
    setPhase("tutorial");
    const b=buildTutorialBoard(t.rows,t.cols,t.spec);
    setBoard(b);
    setGs("playing"); // tutorials start pre-populated, already "playing"
    setFC(false);
    setMLeft(t.mines);
    setTime(0);
    setRipple({});setNumPop(new Set());setFlagAnim(new Set());
    setShake(false);setCombo(0);setLostCell(null);setFlagMode(false);setMilestones(new Set());
    particles.current=[];shockwaves.current=[];
    setTutIdx(idx);
    setTutHint(0);
    setTutHL(t.hints[0]?.highlight||[]);
  };

  // ── 故事动画：每幕约 3.2s 自动推进，第 4 幕停留等待「出发」按钮 ──
  useEffect(()=>{
    if(phase!=="intro"||introScene>=3)return;
    const tm=setTimeout(()=>setIntroScene(s=>s+1),3200);
    return()=>clearTimeout(tm);
  },[phase,introScene]);
  const finishIntro=()=>{
    try{localStorage.setItem("seenIntro","1");}catch(e){/* 隐私模式忽略 */}
    if(introBackRef.current==="home")setPhase("home");
    else startTutorial(0); // 首次：引导进入教学（教学内可跳过）
  };
  const replayIntro=()=>{introBackRef.current="home";setIntroScene(0);setPhase("intro");};
  // 升级仪式结束 → 继续下一关（终极等级 → 回地图加冕谢幕）
  const dismissRankUp=()=>{
    setShowRankUp(null);
    if(levelIdx<LEVELS.length-1){const next=levelIdx+1;setLevelIdx(next);startLevel(next);snd("playMeow","enter");}
    else setPhase("select");
  };

  const doReveal=(r,c)=>{
    initAudio();
    if(gs==="won"||gs==="lost")return;
    const cell=board[r][c];if(cell.revealed||cell.flagged)return;
    let nb=board;
    if(firstClick){nb=placeMines(board,rows,cols,mines,r,c);setFC(false);setGs("playing");}

    if(nb[r][c].mine){
      setTimeout(()=>{
        const lb=nb.map(row=>row.map(cell=>cell.mine?{...cell,revealed:true}:cell));
        setBoard(lb);
      },350);
      setGs("lost");setLostCell({r,c});
      setLostLine(pickFailLine());
      const{x,y}=cellPx(r,c);
      addSW(x,y,"#D4A870");
      setTimeout(()=>addSW(x,y,"#A07848"),80);
      setTimeout(()=>addSW(x,y,"#8B6040"),180);
      addP(poopParticles(x,y,55));addP(poopSplat(x,y,22));
      setTimeout(()=>{addP(poopCloud(x,y,10,80));addP(stinkRise(x,y,5,60));},50);
      setTimeout(()=>{addP(poopCloud(x,y,9,130));addP(stinkRise(x,y,7,90));},260);
      setTimeout(()=>{addP(poopCloud(x,y,8,170));addP(stinkRise(x,y,6,120));},500);
      setTimeout(()=>{addP(poopCloud(x,y,7,200));addP(stinkRise(x,y,8,150));},780);
      setTimeout(()=>{addP(poopCloud(x,y,5,220));addP(stinkRise(x,y,4,180));},1060);
      setTimeout(()=>{setShake(true);setTimeout(()=>setShake(false),700);},110);
      snd("playExplosion");
      setTimeout(()=>snd("playMeow","shock"),550);  // 真实猫咪惊叫（素材未载入时回退合成曲线）
      setTimeout(()=>snd("playRumble"),1100);
      setTimeout(()=>snd("playMeow","whine"),1750); // 哀怨长喵，叠在惊叫之后
      return;
    }

    const{board:rev,order}=floodReveal(nb,r,c,rows,cols);
    setBoard(rev);
    // tiny sand splash on single reveal, larger burst on cascade
    {const{x:sx,y:sy}=cellPx(r,c);addP(sandSplash(sx,sy,order.length===1?4:Math.min(order.length,10)));}
    if(order.length===1)snd("playReveal",nb[order[0].r]?.[order[0].c]?.count??0);
    else if(order.length>=2)snd("playCascade",order.length);
    else snd("playClick");
    if(order.length>=12)setTimeout(()=>snd("playMeow","cascade"),280); // 大片连开：兴奋喵
    if(order.length>1&&order.length<=8)
      order.forEach(({r,c,dist})=>{const cnt=nb[r]?.[c]?.count??0;
        if(cnt>0)setTimeout(()=>snd("playReveal",cnt),dist*80+50);});
    const STEP=90; // ms per distance unit — slower = more contemplative
    const rip={};
    order.forEach(({r,c,dist})=>{rip[`${r},${c}`]=dist*STEP;});
    setRipple(rip);
    const maxD=Math.max(...order.map(o=>o.dist))*STEP+500;
    setTimeout(()=>setRipple({}),maxD);
    const npSet=new Set(order.map(o=>`${o.r},${o.c}`));
    setNumPop(npSet);setTimeout(()=>setNumPop(new Set()),maxD+300);
    const newCombo=combo+order.length;setCombo(newCombo);
    // advance tutorial hint on first reveal
    if(phase==="tutorial" && newCombo===order.length){
      const t=TUTORIALS[tutIdx];
      const nextHint=tutHint+1;
      if(nextHint<t.hints.length && t.hints[nextHint].trigger==="first_reveal"){
        setTutHint(nextHint);
        setTutHL(t.hints[nextHint].highlight||[]);
      }
    }

    // ── MILESTONE POSITIVE FEEDBACK ──────────────────────────────────────────
    // Safe cells = total cells - mines. Milestones at 25%, 50%, 75%.
    // 100% is handled by checkWin (full fireworks). Each milestone fires once per level.
    // Intensity scales with milestone tier: subtle → moderate → strong.
    const safeCells = rows*cols - mines;
    const revealedCount = newCombo; // combo = total cells revealed this level
    const pctDone = revealedCount / safeCells;

    // Find which milestone we just crossed (check highest first to avoid double-fire)
    const MILESTONES = [
      { pct:.75, tier:3 },
      { pct:.50, tier:2 },
      { pct:.25, tier:1 },
    ];
    const crossed = MILESTONES.find(m=>pctDone>=m.pct && !milestones.has(m.pct));
    if(crossed && !checkWin(rev)){
      setMilestones(prev=>new Set([...prev, crossed.pct]));
      // Center of the board for feedback placement
      const bRect = boardRef.current?.getBoundingClientRect();
      const cx = bRect ? bRect.left+bRect.width/2  : window.innerWidth/2;
      const cy = bRect ? bRect.top+bRect.height/2  : window.innerHeight/2;

      if(crossed.tier===1){
        // 25%: one quiet shimmer ring at board center — peripheral, non-intrusive
        setTimeout(()=>{
          addSW(cx, cy, `hsla(140,70%,60%,.5)`);
          snd("playReveal", 3);
        }, maxD * 0.6);

      } else if(crossed.tier===2){
        // 50%: two expanding rings + 8 strand sparks from center outward
        setTimeout(()=>{
          addSW(cx, cy, `hsla(160,80%,65%,.7)`);
          setTimeout(()=>addSW(cx, cy, `hsla(200,80%,65%,.5)`), 180);
          // 8 short strands radiating like a compass rose — not full firework
          const miniStrands = Array.from({length:8},(_,i)=>{
            const ang=(i/8)*Math.PI*2, spd=7+Math.random()*4;
            return mkStrand(cx,cy,Math.cos(ang)*spd,Math.sin(ang)*spd,
              ["#E8855A","#F2A7BB","#C9A96E"][i%3], 2, 10);
          });
          addP(miniStrands);
          snd("playCascade", 8);
          setTimeout(()=>snd("playMeow","milestone"),350); // 满足喵
        }, maxD * 0.5);

      } else if(crossed.tier===3){
        // 75%: feels like the finish line approaching — stronger burst, screen edges only
        setTimeout(()=>{
          addSW(cx, cy, `hsla(180,90%,65%,.9)`);
          setTimeout(()=>addSW(cx, cy, `hsla(220,80%,65%,.6)`), 150);
          setTimeout(()=>addSW(cx, cy, `hsla(260,70%,65%,.4)`), 320);
          // mini firework in two opposing corners (not center — user is still thinking)
          const fr=frameRect();
          addP(firework(fr.left+fr.width*0.05, fr.top+fr.height*0.12));
          setTimeout(()=>addP(firework(fr.left+fr.width*0.95, fr.top+fr.height*0.88)), 200);
          snd("playMeow","milestone"); // 满足喵（终点将近）
        }, maxD * 0.4);
      }
    }

    if(checkWin(rev)){
      setGs("won");
      snd("playReveal",5);

      if(phase==="tutorial"){
        // tutorial complete: advance to next tutorial or enter game
        const nextTut=tutIdx+1;
        if(nextTut<TUTORIALS.length){
          setTimeout(()=>startTutorial(nextTut),1600);
        } else {
          // all tutorials done → go to level select
          setTimeout(()=>{ setPhase("select"); },1800);
        }
        // small celebratory ring at board center
        const bRect=boardRef.current?.getBoundingClientRect();
        if(bRect){
          const cx=bRect.left+bRect.width/2, cy=bRect.top+bRect.height/2;
          addSW(cx,cy,"#E8855A");
          setTimeout(()=>addSW(cx,cy,"rgba(232,133,90,.5)"),200);
        }
        return;
      }

      // 升级判定：首次通关场景末关（4/8/12/16/20）→ 颁发勋章 + 升级仪式
      const firstClear=bestTimes[levelIdx]===null;
      const rankUp=firstClear&&levelIdx%4===3;

      // save best time
      setBestTimes(prev=>{
        const next=[...prev];
        if(next[levelIdx]===null||time<next[levelIdx])next[levelIdx]=time;
        try{localStorage.setItem("minesweeper_best",JSON.stringify(next));}catch(_){}
        return next;
      });
      snd("playLevelUp");
      setShowLU(true);
      // Fireworks: peripheral screen edges only (corners + sides), NOT center
      // Center is occupied by the splash card — fireworks frame it from the sides
      // Staggered 400ms after splash appears so user reads the card first
      const fr=frameRect();
      [
        [400, .05,.15, "heart"],   // top-left
        [520, .95,.15, "paw"  ],   // top-right
        [660, .05,.85, "paw"  ],   // bottom-left
        [780, .95,.85, "heart"],   // bottom-right
        [920, .08,.5,  "heart"],   // left-mid
        [1040,.92,.5,  "paw"  ],   // right-mid
        [1200,.5, .06, "heart"],   // top-mid
      ].forEach(([delay,xf,yf,kind])=>{
        setTimeout(()=>{
          const x=fr.left+fr.width*xf,y=fr.top+fr.height*yf;
          addP(kind==="heart"?heartFirework(x,y):pawFirework(x,y));
        },delay);
      });
      if(rankUp){
        // 升级仪式：Splash 之后弹出全屏颁章卡片（爪印粒子环绕），由按钮继续
        const newRank=Math.floor(levelIdx/4)+1;
        setTimeout(()=>{
          setShowLU(false);setShowRankUp(newRank);
          snd("playMeow","rankup"); // 庄重长喵 + 钟声泛音
        },2400);
      } else if(levelIdx<LEVELS.length-1){
        // auto-advance after 2.8s if not last level
        setTimeout(()=>{
          setShowLU(false);
          const next=levelIdx+1;
          setLevelIdx(next);
          startLevel(next);
          snd("playMeow","enter");
        },2800);
      } else {
        // last level cleared — return to select after a beat
        setTimeout(()=>{setShowLU(false);setPhase("select");},4500);
      }
    }
  };

  const doFlag=(r,c)=>{
    initAudio();
    if(gs==="won"||gs==="lost")return;
    const cell=board[r][c];if(cell.revealed)return;
    const nb=board.map(row=>row.map(cell=>({...cell})));
    nb[r][c].flagged=!nb[r][c].flagged;
    setBoard(nb);setMLeft(m=>nb[r][c].flagged?m-1:m+1);
    if(nb[r][c].flagged){
      const key=`${r},${c}`;
      setFlagAnim(prev=>new Set([...prev,key]));
      setTimeout(()=>setFlagAnim(prev=>{const s=new Set(prev);s.delete(key);return s;}),500);
      const{x,y}=cellPx(r,c);addP(ring(x,y,10,["#E8855A","#F2A7BB","#C9A96E"]));addSW(x,y,"#E8855A");
      snd("playFlag");
      // advance tutorial hint on first flag
      if(phase==="tutorial"){
        const t=TUTORIALS[tutIdx];
        const nextHint=tutHint+1;
        if(nextHint<t.hints.length && t.hints[nextHint].trigger==="flagged"){
          setTutHint(nextHint);
          setTutHL(t.hints[nextHint].highlight||[]);
        }
      }
    } else snd("playUnflag");
  };

  // ── cell size — used only for font-size estimation ──────────────────────
  const TOP_H = 52;
  const BOT_H = 72;
  const activeLv = _activeLv;
  const [cs, setCs] = useState(32);
  const aRows = activeLv.rows, aCols = activeLv.cols;
  useEffect(()=>{
    function calc(){
      const fr=frameRef.current?.getBoundingClientRect();
      const availW = fr?fr.width:window.innerWidth;
      const availH = (fr?fr.height:window.innerHeight) - TOP_H - BOT_H;
      const byW = Math.floor(availW / aCols);
      const byH = Math.floor(availH / aRows);
      setCs(Math.max(18, Math.min(byW, byH)));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [aRows, aCols]);

  // 场景换肤：levelIdx 推导场景索引（教学关用基准猫砂盆皮肤）
  const skin = SCENE_SKIN[phase==="game" ? Math.floor(levelIdx/4) : 0];

  return(
    <div style={{width:"100%",height:"100dvh",display:"flex",overflow:"hidden",background:"#33272E"}}>
    <div ref={frameRef} style={{
      width:"min(100vw, calc(100dvh * 390 / 844))",
      height:"min(100dvh, calc(100vw * 844 / 390))",
      margin:"auto",background:"#FDF6EC",
      display:"flex",flexDirection:"column",alignItems:"stretch",
      fontFamily:"system-ui,'PingFang SC','Noto Sans SC',sans-serif",overflow:"hidden",position:"relative",
      boxShadow:"0 0 60px rgba(0,0,0,.5)",
    }}>
      <style>{`
        @keyframes aurora{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes rippleIn{0%{transform:scale(0.5);opacity:0;filter:brightness(1.4)}60%{transform:scale(1.06);opacity:1;filter:brightness(1.1)}100%{transform:scale(1);opacity:1;filter:brightness(1)}}
        @keyframes numBounce{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes flagBounce{0%{transform:scale(0) rotate(-30deg)}50%{transform:scale(1.5) rotate(10deg)}75%{transform:scale(.85) rotate(-5deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes boardShake{0%,100%{transform:translate(0,0)}10%{transform:translate(-6px,4px)}20%{transform:translate(6px,-4px)}30%{transform:translate(-4px,6px)}40%{transform:translate(5px,-4px)}60%{transform:translate(4px,-3px)}}
        @keyframes comboFlash{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes lostCellPulse{0%,100%{background:rgba(224,90,90,.5)}50%{background:rgba(232,133,90,.8)}}
        @keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes levelUpIn{0%{transform:scale(.7) translateY(30px);opacity:0}60%{transform:scale(1.05) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes shimmer{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes hintIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pawFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes nodeGlow{0%,100%{box-shadow:0 0 0 4px rgba(201,169,110,.3),0 4px 12px rgba(201,169,110,.4)}50%{box-shadow:0 0 0 7px rgba(201,169,110,.15),0 4px 18px rgba(201,169,110,.6)}}
        @keyframes shakeno{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes tipFade{0%{opacity:0;transform:translate(-50%,6px)}15%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}
        @keyframes introFade{from{opacity:0}to{opacity:1}}
        @keyframes signIn{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes poopPop{0%{opacity:0;transform:scale(0) translateY(10px)}70%{opacity:1;transform:scale(1.2) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes introShake{0%,100%{transform:translate(-50%,0) rotate(0)}25%{transform:translate(-52%,-3px) rotate(-2deg)}75%{transform:translate(-48%,-2px) rotate(2deg)}}
        @keyframes qBlink{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-5px)}}
        @keyframes catStep{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes starTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
        @keyframes medalGrow{from{transform:scale(0)}to{transform:scale(2)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pawfly{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.15);opacity:0}}
        @keyframes medalShine{50%{box-shadow:inset 3px 3px 0 rgba(255,255,255,.5), inset -3px -3px 0 rgba(0,0,0,.15), 0 0 22px 7px rgba(242,193,78,.85)}}
        @keyframes sunpulse{50%{box-shadow:0 0 0 10px rgba(255,233,168,.5), 0 0 40px 20px rgba(255,233,168,.65)}}
        @keyframes drift{to{transform:translateX(26px)}}
        @keyframes fly{to{transform:translateX(480px) translateY(-14px)}}
        @keyframes flutter{30%{transform:translate(60px,-22px) rotate(12deg)}70%{transform:translate(140px,-6px) rotate(-10deg)}100%{transform:translate(200px,-30px)}}
        @keyframes bob{50%{transform:translateY(-6px)}}
        @keyframes floaty{50%{transform:translateY(-8px);opacity:.72}}
        @keyframes btnbreath{50%{transform:translateX(-50%) scale(1.05)}}
        @keyframes creep{0%{transform:translateX(0)}50%{transform:translateX(110px) translateY(-3px)}100%{transform:translateX(110px)}}
        @keyframes blinkq{50%{opacity:.15}}
        @keyframes popIn{60%{transform:scale(1.25);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes shakeFast{25%{transform:translateX(-4px) rotate(-2deg)}75%{transform:translateX(4px) rotate(2deg)}}
        @keyframes nodepulse{50%{transform:scale(1.12)}}
        @keyframes toastfade{0%{opacity:0;transform:translateY(6px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
        @keyframes mapTwinkle{50%{opacity:.25}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
      `}</style>
      {_qs?.get("noanim")&&<style>{`*{animation:none!important;transition:none!important;}`}</style>}

      {/* ── backgrounds（随场景换肤）── */}
      <div style={{position:"absolute",inset:0,zIndex:0,
        ...((phase==="game"||phase==="tutorial")?skin.page:{background:"#FDF6EC"})}}/>
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
        background:"radial-gradient(ellipse 100% 45% at 50% 0%,rgba(168,212,230,.35) 0%,transparent 65%),radial-gradient(ellipse 70% 35% at 0% 100%,rgba(141,200,122,.15) 0%,transparent 60%),radial-gradient(ellipse 50% 30% at 100% 80%,rgba(242,167,187,.12) 0%,transparent 60%)",
        backgroundSize:"200% 200%",animation:"aurora 12s ease infinite"}}/>
      {/* 粒子画布：需在通关 Splash(z60) 之上让烟花环绕卡片，在升级仪式幕布(z65) 之下被聚焦暗幕压住 */}
      <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:62,pointerEvents:"none"}}/>

      {/* ── 升级仪式（验收稿 ④：暗色幕布 + 勋章放大 + 爪印粒子环绕）── */}
      {showRankUp!==null&&(
        <div
          onClick={dismissRankUp}
          onTouchEnd={e=>{e.preventDefault();dismissRankUp();}}
          style={{position:"absolute",inset:0,zIndex:65,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",
            background:"rgba(60,42,30,.78)"}}>
          <div style={{position:"relative",width:76,height:76,marginBottom:40}}>
            <div style={{animation:"medalGrow .8s cubic-bezier(.2,1.6,.4,1) both"}}>
              <MedalBadge rank={showRankUp} earned size={76}/>
            </div>
            {Array.from({length:8},(_,i)=>{
              const a=(i/8)*Math.PI*2;
              return(
                <span key={i} style={{position:"absolute",left:28,top:28,fontSize:22,opacity:0,
                  "--dx":`${Math.round(Math.cos(a)*90)}px`,"--dy":`${Math.round(Math.sin(a)*90)}px`,
                  animation:"pawfly 1.2s .25s ease-out forwards"}}>{i%2?"🐾":"✨"}</span>
              );
            })}
          </div>
          <div style={{color:"#FFE9A8",fontSize:22,fontWeight:900,marginTop:22,letterSpacing:3,
            textShadow:"2px 2px 0 #8B6355",animation:"fadeUp .6s .5s both"}}>
            升级！{RANKS[showRankUp].title}
          </div>
          <div style={{color:"#fff",fontSize:14,marginTop:8,animation:"fadeUp .6s .8s both"}}>
            {RANKS[showRankUp].ceremony}
          </div>
          <button style={{
            marginTop:26,animation:"fadeUp .6s 1.1s both",
            background:"#F2A7BB",border:"none",boxShadow:"0 3px 0 #D98AA0",
            borderRadius:14,color:"#fff",fontSize:13,fontWeight:700,letterSpacing:2,
            padding:"7px 18px",cursor:"pointer",fontFamily:"inherit",
          }}>{levelIdx<LEVELS.length-1?"继续冒险 🐾":"加冕完成 👑"}</button>
        </div>
      )}

      {/* ── 勋章墙 ── */}
      {showMedals&&(
        <div onClick={()=>setShowMedals(false)} style={{position:"absolute",inset:0,zIndex:70,
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(92,64,51,.4)",backdropFilter:"blur(5px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:"88%",maxWidth:360,maxHeight:"82%",overflowY:"auto",
            background:"#FFFBF4",borderRadius:24,padding:"20px 18px",
            border:"2px solid rgba(201,169,110,.4)",
            boxShadow:"0 12px 48px rgba(92,64,51,.3)",
            animation:"levelUpIn .4s cubic-bezier(.34,1.56,.64,1) both"}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:15,fontWeight:900,letterSpacing:2,color:"#8B6355",flex:1}}>
                🏅 勋章墙
              </span>
              <span style={{fontSize:10,color:"#B09070",marginRight:10}}>
                {RANKS.filter((_,i)=>rankEarned(i,bestTimes)).length}/6
              </span>
              <button onClick={()=>setShowMedals(false)} style={{
                background:"none",border:"1px solid rgba(201,169,110,.4)",borderRadius:10,
                color:"#A07848",fontSize:12,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit",
              }}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {RANKS.map((rk,i)=>{
                const earned=rankEarned(i,bestTimes);
                return(
                  <div key={i} style={{
                    display:"flex",flexDirection:"column",alignItems:"center",gap:7,
                    padding:"14px 8px 12px",borderRadius:16,
                    background:earned?"rgba(255,251,244,.9)":"rgba(216,207,190,.18)",
                    border:`1.5px solid ${earned?(rk.flat||rk.color)+"99":"rgba(212,196,160,.5)"}`,
                  }}>
                    <MedalBadge rank={i} earned={earned} size={64}/>
                    <div style={{fontSize:12,fontWeight:700,letterSpacing:.5,
                      color:earned?"#6B4226":"#BBA988"}}>
                      Lv.{i+1} {rk.title}
                    </div>
                    <div style={{fontSize:10,color:earned?"#A08770":"#BBA988"}}>
                      {rk.cond}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LEVEL-UP SPLASH ── */}
      {showLevelUp&&(<>
        {/* 蒙版层(z60) < 粒子画布(z62) < 卡片层(z63)：烟花在蒙版上环绕卡片、不遮挡文字 */}
        <div style={{position:"absolute",inset:0,zIndex:60,
          background:"rgba(253,246,236,.88)",backdropFilter:"blur(10px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,zIndex:63,
          display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{textAlign:"center",animation:"levelUpIn .5s cubic-bezier(.34,1.56,.64,1) both",
            padding:"32px 40px",borderRadius:28,maxWidth:300,
            background:"#FFFBF4",
            border:"2px solid rgba(232,133,90,.4)",
            boxShadow:"0 8px 48px rgba(139,99,85,.18), 0 24px 48px rgba(139,99,85,.12)"}}>
            <div style={{fontSize:52,marginBottom:8,animation:"pawFloat 1.5s ease-in-out infinite"}}>{lv.emoji}</div>
            <div style={{
              fontSize:10,letterSpacing:4,color:"#E8855A",
              marginBottom:8,textTransform:"uppercase",fontWeight:700,
            }}>如 厕 成 功</div>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:1,marginBottom:6,
              color:"#8B6355"}}>
              {lv.name}
            </div>
            <div style={{fontSize:12,color:"#A07848",marginBottom:18,lineHeight:1.6}}>
              {VICTORY_LINES[levelIdx]}
            </div>
            {levelIdx<LEVELS.length-1&&(
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"8px 18px",borderRadius:20,
                background:"rgba(232,133,90,.08)",
                border:"1px solid rgba(232,133,90,.25)",
              }}>
                <span style={{fontSize:16}}>{LEVELS[levelIdx+1].emoji}</span>
                <span style={{fontSize:11,color:"#E8855A",letterSpacing:1,
                  animation:"shimmer 1.2s ease-in-out infinite"}}>
                  下一关：{LEVELS[levelIdx+1].name}
                </span>
              </div>
            )}
            {levelIdx===LEVELS.length-1&&(
              <div style={{fontSize:15,color:"#E8855A",fontWeight:900,letterSpacing:1}}>
                👑 全部通关！我就是如厕之王！
              </div>
            )}
          </div>
        </div>
      </>)}

      {/* ══════════════════════════════════════════════════════
          INTRO — 4 幕故事动画（首次进入 / 重看故事）
          ══════════════════════════════════════════════════════ */}
      {phase==="intro"&&(
        <div style={{
          position:"absolute",inset:0,zIndex:20,overflow:"hidden",
          display:"flex",flexDirection:"column",
          background:INTRO_BG[introScene],
          transition:"background .7s ease",
        }}>
          {/* 跳过 */}
          <button onClick={finishIntro} style={{
            position:"absolute",top:`max(env(safe-area-inset-top),14px)`,right:14,zIndex:10,
            background:introScene===0?"rgba(255,246,232,.14)":"rgba(139,99,85,.12)",
            border:introScene===0?"1px solid rgba(255,246,232,.35)":"1px solid rgba(139,99,85,.4)",
            borderRadius:14,color:introScene===0?"#EDE3CC":"#8B6355",fontSize:11,letterSpacing:2,
            padding:"5px 13px",cursor:"pointer",fontFamily:"inherit",
          }}>跳过 ▸</button>
          {/* 幕进度点（验收稿 .dots） */}
          <div style={{position:"absolute",top:`max(env(safe-area-inset-top),20px)`,left:"50%",
            transform:"translateX(-50%)",display:"flex",gap:8,zIndex:10}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:8,height:8,borderRadius:"50%",
                background:i===introScene?"#E8855A":"#EAD9BC",transition:"background .4s"}}/>
            ))}
          </div>

          <div style={{flex:1,position:"relative"}}>
            {/* 第1幕（s1）：夜 · 像素月亮 + 星星 + 发光窗 + 木地板 + 剪影猫 */}
            {introScene===0&&(
              <div key="s0" style={{position:"absolute",inset:0,animation:"introFade .7s ease both"}}>
                <div style={{position:"absolute",top:26,left:30,width:34,height:34,borderRadius:"50%",
                  background:"#F4EDD8",boxShadow:"inset -7px -5px 0 #D8CFB4, 0 0 18px 5px rgba(244,237,216,.3)"}}/>
                {[["20px","auto","46px",0],["54px","auto","90px",.5],["36px","96px","auto",.9],["80px","54px","auto",1.3]].map(([t,l,r],i)=>(
                  <span key={i} style={{position:"absolute",top:t,left:l,right:r,color:"#FFE9A8",fontSize:10,
                    animation:`starTwinkle 1.8s ease-in-out infinite ${i*.45}s`}}>✦</span>
                ))}
                <div style={{position:"absolute",top:150,left:"50%",transform:"translateX(-50%)",
                  width:140,height:140,background:"#FFE9A8",border:"6px solid #1C1830",
                  boxShadow:"0 0 36px 10px rgba(255,233,168,.35)"}}>
                  <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:6,background:"#1C1830",transform:"translateX(-50%)"}}/>
                  <div style={{position:"absolute",top:"50%",left:0,right:0,height:6,background:"#1C1830",transform:"translateY(-50%)"}}/>
                </div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:200,
                  background:"repeating-linear-gradient(0deg, #5A4634 0 13px, #4E3C2C 13px 26px)"}}/>
                <div style={{position:"absolute",bottom:190,left:"50%",marginLeft:-46,width:92,height:13,
                  borderRadius:"50%",background:"rgba(40,25,12,.25)",filter:"blur(1px)"}}/>
                <div style={{position:"absolute",bottom:196,left:"50%",transform:"translateX(-50%)"}}>
                  <Sprite map={SPR.catSit} scale={6} pal={SIL}/>
                </div>
                <WoodSign>「铲屎的出远门了。<br/>这个家，现在归我管。」</WoodSign>
              </div>
            )}
            {/* 第2幕（s2）：砂盆特写 + 💩 依次冒出 + ❗ */}
            {introScene===1&&(
              <div key="s1" style={{position:"absolute",inset:0,animation:"introFade .7s ease both"}}>
                <Swin style={{top:44,left:24}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:210,
                  backgroundImage:"radial-gradient(circle at 12% 30%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 38% 60%, #B8935A 0 2px, transparent 3px),radial-gradient(circle at 64% 26%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 86% 58%, #B8935A 0 2px, transparent 3px),linear-gradient(#D9BC85, #C9A96E)",
                  backgroundSize:"56px 40px,56px 40px,56px 40px,56px 40px,100% 100%"}}/>
                <div style={{position:"absolute",bottom:196,left:"50%",marginLeft:-100,width:200,height:16,
                  borderRadius:"50%",background:"rgba(90,60,30,.18)",filter:"blur(1px)"}}/>
                <div style={{position:"absolute",bottom:206,left:"50%",transform:"translateX(-50%)"}}>
                  <Sprite map={SPR.box} scale={9}/>
                </div>
                {[[336,70,5,.5],[356,170,4,1.1],[326,256,6,1.7]].map(([b,l,sc,d],i)=>(
                  <div key={i} style={{position:"absolute",bottom:b,left:l,transform:"scale(0)",
                    animation:`popIn .5s ${d}s forwards`}}>
                    <Sprite map={SPR.poop} scale={sc}/>
                  </div>
                ))}
                <div style={{position:"absolute",top:180,right:70,fontSize:30,opacity:0,
                  animation:"popIn .4s 2.1s forwards"}}>❗</div>
                <WoodSign>「但是……没有人铲屎了。」</WoodSign>
              </div>
            )}
            {/* 第3幕（s3）：憋不住了 · 惊吓猫狂抖 + 💦 + 😖 */}
            {introScene===2&&(
              <div key="s2" style={{position:"absolute",inset:0,animation:"introFade .7s ease both"}}>
                <Swin style={{top:44,right:24}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:200,
                  background:"repeating-linear-gradient(0deg, #5A4634 0 13px, #4E3C2C 13px 26px)"}}/>
                <div style={{position:"absolute",top:"28%",left:"50%",marginLeft:-80,
                  animation:"shakeFast .18s linear infinite"}}>
                  <Sprite map={SPR.catShock} scale={8}/>
                </div>
                <div style={{position:"absolute",top:"calc(28% + 158px)",left:"50%",marginLeft:-56,
                  width:112,height:14,borderRadius:"50%",background:"rgba(40,25,12,.25)",filter:"blur(1px)"}}/>
                <div style={{position:"absolute",top:"25%",left:"50%",marginLeft:74,fontSize:24,
                  animation:"floaty 1s ease-in-out infinite"}}>💦</div>
                <div style={{position:"absolute",top:"46%",left:"50%",marginLeft:-140,fontSize:22,
                  animation:"floaty 1.3s ease-in-out infinite"}}>😖</div>
                <WoodSign>「可我还是得上厕所啊！！」</WoodSign>
              </div>
            )}
            {/* 第4幕（s4）：白天砂地 · 踮爪潜行向砂盆 + 问号 + 出发 */}
            {introScene===3&&(
              <div key="s3" style={{position:"absolute",inset:0,animation:"introFade .7s ease both"}}>
                <div style={{position:"absolute",top:70,right:32,width:30,height:30,background:"#FFE9A8",
                  border:"3px solid #F2C14E",
                  boxShadow:"0 0 0 7px rgba(255,233,168,.4), 0 0 34px 16px rgba(255,233,168,.55)"}}/>
                <Cloud style={{top:54,left:30}} scale={.45}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:230,
                  backgroundImage:"radial-gradient(circle at 12% 30%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 38% 60%, #B8935A 0 2px, transparent 3px),radial-gradient(circle at 64% 26%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 86% 58%, #B8935A 0 2px, transparent 3px),linear-gradient(#D9BC85, #C9A96E)",
                  backgroundSize:"56px 40px,56px 40px,56px 40px,56px 40px,100% 100%"}}/>
                {[[310,48,.5],[322,84,.38],[310,118,.25]].map(([b,l,op],i)=>(
                  <span key={i} style={{position:"absolute",bottom:b,left:l,fontSize:12,opacity:op,
                    transform:"rotate(90deg)"}}>🐾</span>
                ))}
                <div style={{position:"absolute",bottom:304,right:18,width:112,height:13,
                  borderRadius:"50%",background:"rgba(90,60,30,.18)",filter:"blur(1px)"}}/>
                <div style={{position:"absolute",bottom:312,left:16,animation:"creep 3.4s ease-in-out infinite"}}>
                  <Sprite map={SPR.catTiptoe} scale={6}/>
                </div>
                <div style={{position:"absolute",bottom:304,right:14}}>
                  <Sprite map={SPR.box} scale={5}/>
                </div>
                <div style={{position:"absolute",bottom:452,right:60,fontSize:20,fontWeight:900,color:"#E8855A",
                  textShadow:"1px 1px 0 #fff",animation:"blinkq 1.2s infinite"}}>?</div>
                <div style={{position:"absolute",bottom:480,right:110,fontSize:20,fontWeight:900,color:"#F2A7BB",
                  textShadow:"1px 1px 0 #fff",animation:"blinkq 1.2s .5s infinite"}}>?</div>
                <WoodSign bottom={86}>「凭我的鼻子，避开所有💩——<br/><b>开始如厕大冒险！</b>」</WoodSign>
                <button onClick={finishIntro}
                  onTouchEnd={e=>{e.preventDefault();finishIntro();}}
                  style={{
                  position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",
                  background:"#F2A7BB",border:"none",boxShadow:"0 4px 0 #D98AA0",
                  borderRadius:22,color:"#fff",fontSize:15,fontWeight:700,letterSpacing:4,
                  padding:"10px 40px",cursor:"pointer",fontFamily:"inherit",
                  animation:"btnbreath 2s ease-in-out infinite",zIndex:5,
                }}>出 发 ！</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HOME SCREEN
          ══════════════════════════════════════════════════════ */}
      {phase==="home"&&(
        <div style={{
          position:"absolute",inset:0,zIndex:10,overflow:"hidden",
          background:"linear-gradient(#9FD0E8 0%, #BCE0EF 36%, #DCEFF0 52%, #CFE8C2 60%, #BFDFA8 66%, #E9D5A4 72%, #C9A96E 100%)",
        }}>
          {/* 太阳（方形像素 + 呼吸光晕） */}
          <div style={{position:"absolute",top:24,right:28,width:42,height:42,background:"#FFE9A8",
            border:"3px solid #F2C14E",animation:"sunpulse 4s ease-in-out infinite",
            boxShadow:"0 0 0 7px rgba(255,233,168,.4), 0 0 34px 16px rgba(255,233,168,.55)"}}/>
          {/* 云朵 ×3 */}
          <Cloud style={{top:58,left:22,animation:"drift 9s linear infinite alternate"}}/>
          <Cloud style={{top:104,right:50,animation:"drift 12s linear infinite alternate-reverse"}} scale={.66}/>
          <Cloud style={{top:30,left:"42%",animation:"drift 14s linear infinite alternate",opacity:.8}} scale={.45}/>
          {/* 飞鸟 */}
          <span style={{position:"absolute",top:86,left:-18,fontSize:11,opacity:.75,animation:"fly 13s linear infinite"}}>🐦</span>
          <span style={{position:"absolute",top:64,left:-50,fontSize:9,opacity:.75,animation:"fly 13s 1.2s linear infinite"}}>🐦</span>
          {/* 远景双层草丘 */}
          <div style={{position:"absolute",top:"49%",left:-70,width:"135%",height:130,background:"#AFD592",borderRadius:"50%"}}/>
          <div style={{position:"absolute",top:"52.5%",left:"32%",width:"120%",height:130,background:"#9ECB81",borderRadius:"50%"}}/>
          {/* 白栅栏 */}
          <div style={{position:"absolute",top:"56%",left:0,right:0,height:26,opacity:.9,
            background:"repeating-linear-gradient(90deg, #FFF6E4 0 7px, transparent 7px 24px)"}}>
            <div style={{position:"absolute",top:7,left:0,right:0,height:4,background:"#F4E7CC"}}/>
          </div>
          {/* 花丛 + 蝴蝶 */}
          <span style={{position:"absolute",top:"58.8%",left:30,fontSize:13}}>🌼</span>
          <span style={{position:"absolute",top:"60.8%",left:64,fontSize:13}}>🌷</span>
          <span style={{position:"absolute",top:"59.6%",right:40,fontSize:13}}>🌼</span>
          <span style={{position:"absolute",top:"61.7%",right:84,fontSize:13}}>🌻</span>
          <span style={{position:"absolute",top:"50%",left:60,fontSize:14,animation:"flutter 7s ease-in-out infinite alternate"}}>🦋</span>
          {/* 木质招牌标题（带钉子，微倾） */}
          <div style={{position:"absolute",top:"26.5%",left:"50%",transform:"translateX(-50%) rotate(-1.5deg)",
            background:"linear-gradient(#C89B6A,#B98955)",border:"3px solid #8B6355",borderRadius:10,
            padding:"10px 20px 8px",boxShadow:"0 4px 0 rgba(107,66,38,.4)",whiteSpace:"nowrap"}}>
            <div style={{position:"absolute",top:6,left:8,width:6,height:6,borderRadius:"50%",background:"#6B4226"}}/>
            <div style={{position:"absolute",top:6,right:8,width:6,height:6,borderRadius:"50%",background:"#6B4226"}}/>
            <div style={{fontSize:27,fontWeight:900,color:"#fff",letterSpacing:2,
              textShadow:"2px 2px 0 #E8855A, 4px 4px 0 #6B4226"}}>猫咪如厕大冒险</div>
          </div>
          {/* 粉丝带副标 */}
          <div style={{position:"absolute",top:"40.8%",left:"50%",transform:"translateX(-50%)",
            background:"#F2A7BB",color:"#fff",fontSize:12,letterSpacing:4,whiteSpace:"nowrap",
            padding:"3px 18px",borderRadius:12,boxShadow:"0 2px 0 #D98AA0"}}>独 居 小 猫 的 避 屎 之 旅</div>
          {/* 砂粒质感地面 */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:130,
            backgroundImage:"radial-gradient(circle at 12% 30%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 38% 60%, #B8935A 0 2px, transparent 3px),radial-gradient(circle at 64% 26%, #DDC592 0 2px, transparent 3px),radial-gradient(circle at 86% 58%, #B8935A 0 2px, transparent 3px),linear-gradient(#D9BC85, #C9A96E)",
            backgroundSize:"56px 40px,56px 40px,56px 40px,56px 40px,100% 100%"}}/>
          {/* 角色投影 */}
          <div style={{position:"absolute",bottom:132,left:34,width:96,height:14,borderRadius:"50%",
            background:"rgba(90,60,30,.18)",filter:"blur(1px)"}}/>
          <div style={{position:"absolute",bottom:124,right:26,width:110,height:14,borderRadius:"50%",
            background:"rgba(90,60,30,.18)",filter:"blur(1px)"}}/>
          {/* 踮爪猫 + 猫砂盆 + 爪印足迹 */}
          <div style={{position:"absolute",bottom:138,left:26,zIndex:3,animation:"bob 1.4s ease-in-out infinite"}}>
            <Sprite map={SPR.catTiptoe} scale={7}/>
          </div>
          <div style={{position:"absolute",bottom:128,right:20,zIndex:3}}>
            <Sprite map={SPR.box} scale={5}/>
          </div>
          {[[166,150,.6],[178,180,.45],[166,208,.32],[180,236,.2]].map(([b,l,op],i)=>(
            <span key={i} style={{position:"absolute",bottom:b,left:l,fontSize:12,opacity:op,
              transform:"rotate(90deg)",zIndex:2}}>🐾</span>
          ))}
          {/* 飘浮 💩 / 问号 / 闪光 */}
          <div style={{position:"absolute",bottom:290,right:52,zIndex:4,animation:"floaty 2.6s ease-in-out infinite"}}>
            <Sprite map={SPR.poop} scale={3}/>
          </div>
          <div style={{position:"absolute",bottom:312,right:106,fontSize:19,color:"#E8855A",fontWeight:900,
            textShadow:"1px 1px 0 #fff",zIndex:4,animation:"floaty 2.2s .4s ease-in-out infinite"}}>?</div>
          <div style={{position:"absolute",bottom:336,right:66,fontSize:14,color:"#F2A7BB",fontWeight:900,
            textShadow:"1px 1px 0 #fff",zIndex:4,animation:"floaty 3s .8s ease-in-out infinite"}}>?</div>
          <span style={{position:"absolute",top:"48%",left:36,fontSize:15,zIndex:4,animation:"floaty 2.8s .2s ease-in-out infinite"}}>✨</span>
          <span style={{position:"absolute",top:"66%",right:30,fontSize:15,zIndex:4,animation:"floaty 2.8s 1.2s ease-in-out infinite"}}>✨</span>
          {/* 继续冒险（呼吸感按钮） */}
          <button
            onClick={()=>{initAudio();setPhase("select");}}
            onTouchEnd={e=>{e.preventDefault();initAudio();setPhase("select");}}
            style={{position:"absolute",bottom:72,left:"50%",transform:"translateX(-50%)",
              background:"#F2A7BB",color:"#fff",fontSize:15,fontWeight:700,
              border:"none",borderRadius:22,padding:"9px 34px",zIndex:5,cursor:"pointer",fontFamily:"inherit",
              boxShadow:"0 4px 0 #D98AA0",letterSpacing:2,animation:"btnbreath 2s ease-in-out infinite"}}>
            {bestTimes.some(t=>t!==null)?"继续冒险 ▶":"开始冒险 ▶"}
          </button>
          {/* 次级入口：教学 / 重看故事 / 勋章墙 */}
          <div style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",
            display:"flex",gap:8,zIndex:5,whiteSpace:"nowrap"}}>
            {[["📖 如厕入门",()=>{initAudio();startTutorial(0);}],
              ["🌙 重看故事",replayIntro],
              ["🏅 勋章墙",()=>setShowMedals(true)]].map(([label,fn],i)=>(
              <button key={i} onClick={fn} style={{
                padding:"7px 13px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",
                background:"rgba(255,251,244,.85)",border:"1.5px solid rgba(139,99,85,.35)",
                color:"#8B6355",fontSize:11,fontWeight:700,letterSpacing:1,
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SELECT SCREEN — winding path
          ══════════════════════════════════════════════════════ */}
      {phase==="select"&&(()=>{
        const firstUndone=bestTimes.findIndex(t=>t===null);
        const curIdx=firstUndone===-1?19:firstUndone;
        const myRank=currentRank(bestTimes);
        return(
        <div style={{
          position:"absolute",inset:0,zIndex:10,
          display:"flex",flexDirection:"column",overflow:"hidden",
        }}>
          {/* ── 顶栏（验收稿 ⑦ topbar：等级 + 橙色称号 chip + 迷你勋章）── */}
          <div style={{
            flexShrink:0,height:48,
            paddingLeft:8,paddingRight:10,
            display:"flex",alignItems:"center",gap:6,
            borderBottom:"2px solid #EAD9BC",
            background:"#FFFDF8",
            fontSize:13,fontWeight:700,color:"#6B4226",
          }}>
            <button onClick={()=>setPhase("home")} style={{
              background:"none",border:"none",cursor:"pointer",
              color:"#C9A96E",fontSize:18,padding:"2px 6px",lineHeight:1,
            }}>←</button>
            <span style={{flex:1,whiteSpace:"nowrap"}}>😺 我的如厕等级</span>
            <span style={{
              display:"inline-flex",alignItems:"center",gap:5,
              background:"#FF8C42",color:"#fff",borderRadius:10,
              padding:"3px 10px",fontSize:12,fontWeight:700,whiteSpace:"nowrap",
            }}>
              <MiniMedal rank={myRank} size={20}/>
              {RANKS[myRank].title} Lv.{myRank+1}
            </span>
            <button onClick={()=>setShowMedals(true)} style={{
              background:"rgba(212,168,90,.14)",border:"1px solid rgba(212,168,90,.45)",
              borderRadius:10,fontSize:13,padding:"3px 8px",cursor:"pointer",lineHeight:1.2,
            }}>🏅</button>
          </div>

          {/* ── 上升路线地图（验收稿 ⑦）：底部=第1关，顶部=别墅山顶 ── */}
          <div ref={selectScrollRef} style={{flex:1,overflowY:"auto",overflowX:"hidden",background:"#FDF6EC",position:"relative"}}>
            <div style={{position:"relative",width:"100%",height:_TOTAL_H}}>

              {/* 章节整幅场景背景（flow 自上而下：别墅 → 小号猫砂盆 + 出发段） */}
              <div style={{position:"absolute",inset:0}}>
                <div style={{height:_SUMMIT,...MAP_SEG[4].bg}}/>
                {[4,3,2,1,0].map(ci=>(
                  <div key={ci} style={{height:_SEG,position:"relative",...MAP_SEG[ci].bg}}>
                    {/* 中轴浅色通道（验收稿 .seg::after） */}
                    <div style={{position:"absolute",top:0,bottom:0,left:"50%",transform:"translateX(-50%)",
                      width:"56%",background:"rgba(255,252,244,.45)"}}/>
                    {/* 章节道具（验收稿 segProps：手绘像素/CSS 造型，零 Emoji） */}
                    {ci===0&&(<>
                      <div style={{position:"absolute",top:"16%",left:8,opacity:.9}}><Sprite map={SPR.box} scale={3}/></div>
                      <div style={{position:"absolute",top:"52%",right:10,width:64,height:26,
                        background:"linear-gradient(#DDC592,#C9A96E)",borderRadius:"50% 50% 0 0"}}/>
                      <div style={{position:"absolute",top:"80%",left:18,width:40,height:18,
                        background:"linear-gradient(#DDC592,#C9A96E)",borderRadius:"50% 50% 0 0"}}/>
                      <div style={{position:"absolute",top:"38%",right:44,opacity:.35}}><Sprite map={SPR.paw} scale={3}/></div>
                      <div style={{position:"absolute",top:"66%",left:56,opacity:.25}}><Sprite map={SPR.paw} scale={3}/></div>
                    </>)}
                    {ci===1&&(<>
                      <div style={{position:"absolute",top:"18%",right:8,width:74}}>
                        <div style={{height:34,background:"linear-gradient(#A7CBD9,#8BB7C7)",border:"3px solid #6E9AAB",
                          borderBottom:"none",borderRadius:"40px 40px 0 0",position:"relative"}}>
                          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
                            width:30,height:20,background:"#41606E",borderRadius:"16px 16px 0 0"}}/>
                        </div>
                        <div style={{height:18,background:"#8BB7C7",border:"3px solid #6E9AAB",borderTop:"none",
                          borderRadius:"0 0 10px 10px"}}/>
                      </div>
                      <div style={{position:"absolute",top:"52%",left:10,opacity:.35}}><Sprite map={SPR.paw} scale={3}/></div>
                      <div style={{position:"absolute",top:"76%",left:26,opacity:.9}}><Sprite map={SPR.poop} scale={3}/></div>
                    </>)}
                    {ci===2&&(<>
                      <Swin style={{top:"14%",left:12,zIndex:2}}/>
                      <div style={{position:"absolute",top:"48%",right:8,width:84,height:34,opacity:.9,
                        background:"#E8B4B8",border:"3px solid #D49A9E",borderRadius:"50%"}}/>
                      <div style={{position:"absolute",top:"74%",left:18}}><Sprite map={SPR.yarn} scale={3}/></div>
                    </>)}
                    {ci===3&&(<>
                      <div style={{position:"absolute",top:"14%",left:14,display:"flex",gap:8}}>
                        {[0,1,2].map(w=>(
                          <span key={w} style={{width:20,height:24,display:"block",border:"3px solid #5F6878",
                            background:w===1?"#41606E":"linear-gradient(#FFE9A8,#F2C14E)"}}/>
                        ))}
                      </div>
                      <div style={{position:"absolute",top:"48%",right:12}}><Sprite map={SPR.plant} scale={3}/></div>
                      <div style={{position:"absolute",top:"76%",right:14,display:"flex",gap:8}}>
                        {[0,1].map(w=>(
                          <span key={w} style={{width:20,height:24,display:"block",border:"3px solid #5F6878",
                            background:w===0?"#41606E":"linear-gradient(#FFE9A8,#F2C14E)"}}/>
                        ))}
                      </div>
                    </>)}
                    {ci===4&&(<>
                      <div style={{position:"absolute",top:"50%",left:8}}><Sprite map={SPR.tree} scale={3}/></div>
                      <div style={{position:"absolute",top:"70%",right:8}}><Sprite map={SPR.tree} scale={3}/></div>
                      <span style={{position:"absolute",top:"45%",right:58,width:5,height:5,background:"#F2C14E",
                        animation:"mapTwinkle 1.6s infinite"}}/>
                      <span style={{position:"absolute",top:"78%",left:52,width:5,height:5,background:"#F2C14E",
                        animation:"mapTwinkle 1.6s .6s infinite"}}/>
                      <div style={{position:"absolute",top:"92%",left:0,right:0,height:18,
                        background:"radial-gradient(circle at 11px 18px, #8DC87A 0 9px, transparent 10px)",
                        backgroundSize:"22px 18px"}}/>
                    </>)}
                    {/* sticky 章节横幅（验收稿 .chapter 胶囊样式 + 迷你勋章，实现按约定吸顶） */}
                    <div style={{position:"sticky",top:6,zIndex:6,display:"flex",justifyContent:"center",
                      pointerEvents:"none",height:0}}>
                      <div style={{
                        display:"inline-flex",alignItems:"center",gap:5,height:26,
                        background:CATEGORIES[ci].color,color:"#fff",whiteSpace:"nowrap",
                        fontSize:12,fontWeight:700,padding:"2px 16px",borderRadius:14,
                        boxShadow:"0 2px 0 rgba(0,0,0,.15)",
                      }}>
                        <MiniMedal rank={ci} size={20}/>
                        {CATEGORIES[ci].label} · {CATEGORIES[ci].range[0]+1}-{CATEGORIES[ci].range[1]+1}关
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{height:_BP,...MAP_SEG[0].bg}}/>
              </div>

              {/* 顶部 Key Art 天空：太阳 + 云朵 + 双层草丘 + 像素别墅 */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:240,zIndex:1,overflow:"hidden",
                background:"linear-gradient(#9FD0E8, #BCE0EF 55%, rgba(188,224,239,0))",pointerEvents:"none"}}>
                <div style={{position:"absolute",top:128,left:-70,width:"96%",height:96,borderRadius:"50%",background:"#AFD592"}}/>
                <div style={{position:"absolute",top:142,left:"33%",width:"96%",height:96,borderRadius:"50%",background:"#9ECB81"}}/>
                <div style={{position:"absolute",top:20,right:26,width:30,height:30,background:"#FFE9A8",
                  border:"2px solid #F2C14E",
                  boxShadow:"0 0 0 5px rgba(255,233,168,.4), 0 0 22px 10px rgba(255,233,168,.5)"}}/>
                <Cloud style={{top:36,left:18,zIndex:1}}/>
                <Cloud style={{top:78,right:36,zIndex:1}} scale={.66}/>
                {/* 山顶终点：像素别墅 */}
                <div style={{position:"absolute",top:96,left:"50%",transform:"translateX(-50%)"}}>
                  <Sprite map={SPR.villa} scale={3}/>
                </div>
              </div>

              {/* 节点层 */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:_TOTAL_H,zIndex:2,pointerEvents:"none"}}>
                <svg style={{position:"absolute",top:0,left:0,width:"100%",height:_TOTAL_H}} overflow="visible">
                  {LEVELS.map((_lv,i)=>{
                    if(i===0) return null;
                    const walked=bestTimes[i-1]!==null;
                    return(
                      <line key={i}
                        x1={`${PATH_X[i-1]}%`} y1={_nodeY(i-1)}
                        x2={`${PATH_X[i]}%`}   y2={_nodeY(i)}
                        stroke={walked?"#8DC87A":"#C9B49A"}
                        strokeWidth={5} strokeDasharray="1 12"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                {/* 出发垫（验收稿 .startmat） */}
                <div style={{position:"absolute",top:_nodeY(0)+58,left:"50%",transform:"translateX(-50%)",
                  background:"#F2A7BB",color:"#fff",fontSize:12,fontWeight:700,
                  borderRadius:12,padding:"3px 14px",whiteSpace:"nowrap"}}>🐾 出发！</div>

                {/* 关卡节点（验收稿 .lnode：done绿 / cur橙脉冲 / lock沙）*/}
                {LEVELS.map((lv,i)=>{
                  const done=bestTimes[i]!==null;
                  const isCur=i===curIdx;
                  const unlocked=done||isCur;
                  const isChapterEnd=i%4===3;
                  const ny=_nodeY(i),nx=PATH_X[i];
                  return(
                    <div key={i} style={{
                      position:"absolute",top:ny-_NR,left:`calc(${nx}% - ${_NR}px)`,
                      width:_ND,height:_ND,pointerEvents:"auto",
                    }}>
                      <button
                        key={lockShake===i?`s${shakeSeq}`:"n"}
                        onClick={()=>tapNode(i,unlocked)}
                        onTouchEnd={e=>{e.preventDefault();tapNode(i,unlocked);}}
                        style={{
                          width:_ND,height:_ND,borderRadius:"50%",
                          cursor:unlocked?"pointer":"not-allowed",
                          fontFamily:"inherit",position:"relative",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:16,fontWeight:900,lineHeight:1,
                          ...(done
                            ?{background:"#A8D8A8",border:"3px solid #7FAF7F",color:"#3F6B3F",
                              boxShadow:"0 3px 0 #7FAF7F"}
                            :isCur
                            ?{background:"#FF8C42",border:"3px solid #fff",color:"#fff",
                              boxShadow:"0 0 0 4px rgba(255,140,66,.35), 0 3px 0 #C56A44"}
                            :{background:"#D4C4A0",border:"3px solid #BCA87E",color:"#8B7B5A",opacity:.78}),
                          animation:lockShake===i?"shakeno .35s linear"
                            :isCur?"nodepulse 1.3s ease-in-out infinite":"none",
                        }}>
                        {done?"✓":isCur?(i+1):"🔒"}
                        {/* 场景末关：勋章角标（验收稿 .nodebadge，未达成灰阶） */}
                        {isChapterEnd&&(
                          <span style={{position:"absolute",top:-13,right:-13,zIndex:6}}>
                            <MiniMedal rank={(i+1)/4} size={25} gray={!done}/>
                          </span>
                        )}
                        {/* 星级（验收稿 .stars） */}
                        {done&&(
                          <span style={{position:"absolute",bottom:-15,left:"50%",transform:"translateX(-50%)",
                            fontSize:8,letterSpacing:-1,whiteSpace:"nowrap"}}>
                            {"⭐".repeat(starsFor(i,bestTimes[i]))}
                          </span>
                        )}
                      </button>
                      {/* 未解锁提示 toast（验收稿 .maptoast，就近显示） */}
                      {lockTip&&lockShake===i&&(
                        <div style={{
                          position:"absolute",top:-38,left:"50%",transform:"translateX(-50%)",
                          background:"rgba(107,66,38,.92)",color:"#fff",zIndex:20,
                          fontSize:12,padding:"5px 12px",borderRadius:10,whiteSpace:"nowrap",
                          animation:"toastfade 1.4s forwards",pointerEvents:"none",
                        }}>还没到这里哦 🐾 先通过前面的关卡</div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          GAME / TUTORIAL SCREEN
          ══════════════════════════════════════════════════════ */}
      {(phase==="game"||phase==="tutorial")&&(<>

      {/* ── HEADER (TOP_H) — mines | level+progress | timer ── */}
      <div style={{
        height:TOP_H,flexShrink:0,
        paddingTop:`max(env(safe-area-inset-top),6px)`,
        paddingLeft:14,paddingRight:14,paddingBottom:4,
        position:"relative",zIndex:10,
        display:"flex",alignItems:"center",gap:8,
        background:"rgba(253,246,236,.95)",
        borderBottom:"1px solid rgba(201,169,110,.2)",
      }}>
        {/* ── Left: mine counter ── */}
        <div style={{display:"flex",alignItems:"center",gap:5,minWidth:80}}>
          <span style={{fontSize:15,lineHeight:1,opacity:.8}}>💩</span>
          <span style={{
            fontSize:22,fontWeight:900,letterSpacing:3,
            color:"#6B4226",
            fontVariantNumeric:"tabular-nums",
          }}>{String(Math.max(0,mLeft)).padStart(3,"0")}</span>
        </div>

        {/* ── Center: level info + progress bar ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,overflow:"hidden"}}>
          {phase==="tutorial"?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:11,fontWeight:900,letterSpacing:1,
                  color:"#5A9C5A"}}>
                  教学 {tutIdx+1}/{TUTORIALS.length}
                </span>
                <span style={{fontSize:9,color:"#A07848",whiteSpace:"nowrap"}}>
                  — {TUTORIALS[tutIdx].label}
                </span>
              </div>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                {TUTORIALS.map((_,i)=>(
                  <div key={i} style={{
                    width:i===tutIdx?22:6,height:3,borderRadius:2,
                    background:i<tutIdx?"#8DC87A":i===tutIdx?"#8DC87A":"rgba(201,169,110,.25)",
                    transition:"all .4s",
                  }}/>
                ))}
              </div>
            </>
          ):(
            <>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13}}>{LEVELS[levelIdx].emoji}</span>
                <span style={{
                  fontSize:12,fontWeight:900,letterSpacing:.5,color:"#8B6355",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:110,
                }}>{LEVELS[levelIdx].name}</span>
                <span style={{
                  fontSize:9,color:"#E8855A",letterSpacing:1,
                  background:"rgba(232,133,90,.12)",padding:"1px 5px",borderRadius:4,
                  flexShrink:0,
                }}>Lv.{LEVELS[levelIdx].id}</span>
              </div>
              <div style={{display:"flex",gap:1.5,width:"100%"}}>
                {LEVELS.map((_,i)=>(
                  <div key={i} style={{
                    flex:1,height:2.5,borderRadius:2,
                    background:i<levelIdx?"#8DC87A":i===levelIdx?"#E8855A":"rgba(201,169,110,.2)",
                    transition:"background .4s",
                  }}/>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right: combo dot + timer + mute ── */}
        <div style={{display:"flex",alignItems:"center",gap:5,minWidth:80,justifyContent:"flex-end"}}>
          {combo>1&&(
            <span style={{
              fontSize:9,color:"rgba(232,133,90,.6)",letterSpacing:1,
              fontVariantNumeric:"tabular-nums",
            }}>×{combo}</span>
          )}
          <span style={{fontSize:15,lineHeight:1,opacity:.7}}>⏱</span>
          <span style={{
            fontSize:22,fontWeight:900,letterSpacing:3,
            color:"#8B6355",
            fontVariantNumeric:"tabular-nums",
          }}>{String(Math.min(time,999)).padStart(3,"0")}</span>
          <button onClick={()=>setMuted(m=>!m)} style={{
            background:"none",border:"none",cursor:"pointer",fontSize:14,
            color:muted?"#C9A96E":"#A07848",padding:0,lineHeight:1,marginLeft:2,
          }}>{muted?"🔇":"🔊"}</button>
        </div>
      </div>

      {/* ── BOARD AREA：场景造型外框（完全参照验收稿 ⑤）── */}
      <div style={{
        flex:1, position:"relative", zIndex:10, minHeight:0,
        display:"flex", flexDirection:"column", overflow:"hidden",
        padding:"0 8px 10px",
      }}>
        {/* sk2 顶罩 + 入口拱门 */}
        {skin.hood&&(
          <div style={{flexShrink:0,height:46,margin:"6px 2px 0",position:"relative",
            background:"linear-gradient(#A7CBD9,#8BB7C7)",border:"4px solid #6E9AAB",borderBottom:"none",
            borderRadius:"60px 60px 0 0"}}>
            <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
              width:52,height:30,background:"#41606E",borderRadius:"26px 26px 0 0"}}/>
            <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:16,lineHeight:1}}>😺</div>
          </div>
        )}
        {/* sk3 墙纸 + 窗户 + 相框 + 踢脚线 */}
        {skin.wall&&(
          <div style={{flexShrink:0,height:56,margin:"0 -8px",position:"relative",
            background:"repeating-linear-gradient(90deg, #F6E7D2 0 18px, #F0DCC2 18px 36px)",
            borderBottom:"6px solid #8B6355"}}>
            <div style={{position:"absolute",top:7,left:22,width:44,height:36,background:"#BFE3F0",
              border:"4px solid #8B6355"}}>
              <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:3,background:"#8B6355",transform:"translateX(-50%)"}}/>
            </div>
            <div style={{position:"absolute",top:9,right:24,width:30,height:24,background:"#FDF1DC",
              border:"3px solid #8B6355",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🐟</div>
          </div>
        )}
        {/* sk4 楼顶 + 亮灯窗户排 */}
        {skin.winrow&&(<>
          <div style={{flexShrink:0,height:10,margin:"0 -8px",background:"#7E8696",borderBottom:"3px solid #5F6878"}}/>
          <div style={{flexShrink:0,display:"flex",justifyContent:"center",gap:14,padding:"8px 0 6px",
            margin:"0 -8px",background:"#A0A8B8"}}>
            {[0,1,2].map(i=>(
              <span key={i} style={{width:24,height:20,display:"block",border:"3px solid #5F6878",
                background:i===1?"#41606E":"linear-gradient(#FFE9A8,#F2C14E)"}}/>
            ))}
          </div>
        </>)}
        {/* sk5 山形屋顶 + 烟囱 */}
        {skin.roof&&(
          <div style={{flexShrink:0,position:"relative",margin:"4px 4px 0"}}>
            <div style={{position:"absolute",top:0,right:46,width:14,height:22,background:"#8B6355",
              border:"3px solid #6E4C40",zIndex:1}}/>
            <div style={{height:42,background:"linear-gradient(#C96F4A,#B05B3A)",border:"4px solid #8B4A30",
              clipPath:"polygon(50% 0, 100% 100%, 0 100%)"}}/>
          </div>
        )}
        {/* sk1 盆沿握把 */}
        {skin.handles&&(
          <div style={{flexShrink:0,height:12,position:"relative",margin:"6px 2px 0"}}>
            <div style={{position:"absolute",bottom:0,left:18,width:34,height:12,background:"#C07A4E",borderRadius:"8px 8px 0 0"}}/>
            <div style={{position:"absolute",bottom:0,right:18,width:34,height:12,background:"#C07A4E",borderRadius:"8px 8px 0 0"}}/>
          </div>
        )}

        {/* 外框 tray（踩雷时整框震动，同验收稿 ⑥）*/}
        <div style={{
          flex:1,minHeight:0,position:"relative",margin:"0 2px",padding:6,
          animation:shakeBoard?"boardShake .6s ease-out":"none",
          ...skin.tray,
          outline:gs==="lost"?"2px solid rgba(224,90,90,.45)":"none",
        }}>
          <div ref={boardRef} style={{
            display:"flex",flexDirection:"column",gap:cols>=20?1:2,
            width:"100%",height:"100%",
          }}>
            {board.map((row,r)=>(
              <div key={r} style={{display:"flex",flex:1,gap:cols>=20?1:2}}>
                {row.map((cell,c)=>{
                  const key=`${r},${c}`;
                  const ripDelay=ripple[key]??null;
                  const isNumPop=numPop.has(key);
                  const isFlagAnim=flagAnim.has(key);
                  const isLostCell=lostCell&&lostCell.r===r&&lostCell.c===c;
                  // 验收稿 ⑤：砂粒噪点格 / 耙砂纹翻开格 / 💩格浅暖红；记号格保持砂面+🐾
                  let bgImage=cellSandBg(skin),bgColor="transparent";
                  let cellShadow=`inset 1.5px 1.5px 0 ${skin.hi}, inset -1.5px -1.5px 0 ${skin.lo}`;
                  if(cell.revealed){
                    if(cell.mine){
                      bgImage="none";bgColor="#FFE8D6";
                      cellShadow="inset 1px 1px 4px rgba(0,0,0,.25)";
                    }else{
                      bgImage=cellDugBg(skin);
                      cellShadow=`inset 1px 1px 3px rgba(0,0,0,.2)${cell.count>0?`,inset 0 0 4px ${NUM_GLOW[cell.count].replace(".8",".12")}`:""}`;
                    }
                  }
                  let anim="";
                  if(ripDelay!==null&&cell.revealed&&!cell.mine)
                    anim=`rippleIn .4s cubic-bezier(.34,1.56,.64,1) ${ripDelay}ms both`;
                  if(isFlagAnim) anim=`flagBounce .5s cubic-bezier(.34,1.56,.64,1)`;
                  if(isLostCell) anim=`lostCellPulse .5s ease-in-out infinite`;
                  const numStyle=isNumPop
                    ?{animation:"numBounce .4s cubic-bezier(.34,1.56,.64,1) both",display:"inline-block",
                      textShadow:`0 0 8px ${NUM_GLOW[cell.count]}`}
                    :cell.revealed&&cell.count>0?{textShadow:`0 0 6px ${NUM_GLOW[cell.count]}`}:{};
                  const fsz = cs>=38?14 : cs>=28?11 : 9;
                  const content=cell.flagged&&!cell.revealed?"🐾"
                    :cell.revealed&&cell.mine?"💩"
                    :cell.revealed&&cell.count>0?<span style={numStyle}>{cell.count}</span>:null;
                  return(
                    <div key={c}
                      onContextMenu={e=>{e.preventDefault();doFlag(r,c);}}
                      onTouchStart={e=>{
                        if(gs==="won"||gs==="lost") return;
                        e.preventDefault();
                        lpRef.current=setTimeout(()=>{lpRef.current=null;doFlag(r,c);},450);
                      }}
                      onTouchEnd={e=>{
                        if(gs==="won"||gs==="lost") return;
                        e.preventDefault();
                        if(lpRef.current){
                          clearTimeout(lpRef.current);lpRef.current=null;
                          if(flagMode)doFlag(r,c);else doReveal(r,c);
                        }
                      }}
                      onTouchMove={()=>{if(lpRef.current){clearTimeout(lpRef.current);lpRef.current=null;}}}
                      onClick={()=>{if(flagMode)doFlag(r,c);else doReveal(r,c);}}
                      style={{
                        flex:1, display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:fsz, fontWeight:900,
                        cursor:"pointer", borderRadius:2,
                        touchAction:(gs==="won"||gs==="lost")?"auto":"none",
                        background:bgColor,
                        backgroundImage:bgImage,
                        boxShadow:tutHighlight.some(([hr,hc])=>hr===r&&hc===c)
                          ? `${cellShadow}, inset 0 0 0 2px #E8855A`
                          : cellShadow,
                        color:cell.revealed&&!cell.mine?NUM_COLOR[cell.count]:"#8B6355",
                        transition:"background .08s",
                        animation:anim||"none",
                        userSelect:"none",
                      }}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── FAIL OVERLAY ── */}
          {gs==="lost"&&(
            <div
              onClick={()=>{initAudio();retryLevel();}}
              onTouchEnd={e=>{e.stopPropagation();initAudio();retryLevel();}}
              style={{
                position:"absolute",inset:0,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:12,cursor:"pointer",
                background:"rgba(253,246,236,.82)",
                backdropFilter:"blur(4px)",
                zIndex:30,
              }}>
              <div style={{fontSize:54,animation:"slideUp .3s ease-out",lineHeight:1}}>😱</div>
              <div style={{
                padding:"13px 30px",borderRadius:16,
                background:"rgba(255,251,244,.97)",
                border:"1.5px solid rgba(224,90,90,.4)",
                color:"#E05A5A",fontWeight:900,fontSize:17,letterSpacing:2,
                animation:"slideUp .35s ease-out",
                pointerEvents:"none",
              }}>{lostLine}</div>
              <div style={{
                fontSize:11,color:"rgba(160,120,72,.5)",letterSpacing:2,
                animation:"slideUp .42s ease-out",pointerEvents:"none",
              }}>轻触任意处，再试一次</div>
            </div>
          )}
        </div>

        {/* sk4 阳台栏杆 */}
        {skin.rail&&(
          <div style={{flexShrink:0,height:14,margin:"6px 4px 0",
            background:"repeating-linear-gradient(90deg,#7E8696 0 4px,transparent 4px 14px)",
            borderTop:"4px solid #7E8696"}}/>
        )}
        {/* sk5 花园树篱 */}
        {skin.hedge&&(
          <div style={{flexShrink:0,height:18,margin:"6px 2px 0",
            background:"radial-gradient(circle at 11px 18px, #8DC87A 0 9px, transparent 10px)",
            backgroundSize:"22px 18px"}}/>
        )}
      </div>

      {/* ── TUTORIAL HINT — floats above bottom bar, not in layout flow ── */}
      {phase==="tutorial"&&(
        <div style={{
          position:"absolute",bottom:BOT_H+10,left:12,right:12,
          zIndex:20,animation:"hintIn .3s ease-out",
        }}>
          <div style={{
            background:"rgba(255,251,244,.97)",
            border:"1px solid rgba(141,200,122,.4)",
            borderRadius:14,
            padding:"11px 14px 11px 12px",
            boxShadow:"0 4px 20px rgba(139,99,85,.12)",
            display:"flex",alignItems:"flex-start",gap:10,
          }}>
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2,marginTop:2}}>
              <Sprite map={SPR.catSit} scale={1.7}/>
              <span style={{fontSize:8,color:"#C9A96E",letterSpacing:1}}>咪咪</span>
            </div>
            <div style={{
              flex:1,color:"#8B6355",fontSize:12,lineHeight:1.75,
              letterSpacing:.3,whiteSpace:"pre-line",
            }}>
              {TUTORIALS[tutIdx].hints[Math.min(tutHint,TUTORIALS[tutIdx].hints.length-1)]?.text}
            </div>
            <button
              onClick={()=>setPhase("select")}
              style={{
                background:"none",border:"1px solid rgba(201,169,110,.3)",
                borderRadius:8,color:"#C9A96E",fontSize:10,padding:"4px 10px",
                cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
                alignSelf:"flex-start",lineHeight:1.6,marginTop:1,
              }}>跳过</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div style={{
        height:BOT_H,flexShrink:0,
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        background:"rgba(253,246,236,.98)",
        borderTop:"1px solid #DFC89A",
        display:"flex",alignItems:"center",gap:10,
        paddingLeft:12,paddingRight:12,
        position:"relative",zIndex:10,
      }}>
        {/* ── 模式切换（验收稿 ⑥ demo-btn：绿=探砂 ⇄ 橙=记号）── */}
        <button
          onClick={()=>{initAudio();setFlagMode(m=>!m);}}
          onTouchEnd={e=>{e.preventDefault();initAudio();setFlagMode(m=>!m);}}
          style={{
            flex:1,height:46,border:"none",borderRadius:14,cursor:"pointer",
            fontFamily:"inherit",fontSize:14,fontWeight:900,letterSpacing:1,color:"#fff",
            background:flagMode?"#E8855A":"#8DC87A",
            boxShadow:flagMode?"0 3px 0 #C56A44":"0 3px 0 #6FA85F",
            transition:"background .15s, box-shadow .15s",
          }}>{flagMode?"🚩 记号模式":"🐾 探砂模式"}</button>

        {/* ── 反应猫 / 重试按钮（验收稿 ⑥ 四态像素猫）── */}
        <button
          onClick={()=>{initAudio();retryLevel();}}
          onTouchStart={e=>e.currentTarget.style.transform="scale(.85)"}
          onTouchEnd={e=>{e.preventDefault();e.currentTarget.style.transform="scale(1)";initAudio();retryLevel();}}
          style={{
            width:48,height:48,borderRadius:"50%",cursor:"pointer",
            background:"rgba(201,169,110,.15)",
            border:"2px solid #DFC89A",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,transition:"transform .12s",padding:0,
          }}>
          <Sprite map={SPR[gs==="lost"?"catShock":gs==="won"?"catHappy":"catSit"]} scale={1.9}/>
        </button>

        {/* ── Back to select / home ── */}
        <button
          onClick={()=>setPhase(phase==="tutorial"?"home":"select")}
          style={{
            width:40,height:40,borderRadius:12,cursor:"pointer",
            fontSize:15,background:"rgba(201,169,110,.1)",
            border:"1px solid rgba(201,169,110,.3)",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,color:"#8B6355",transition:"color .2s",
          }}>🏠</button>
      </div>
      </>)}
    </div>
    </div>
  );
}
