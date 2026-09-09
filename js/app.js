/* ============================================================
   小猫侦探 · 世界 / 相机 / 流程
   世界是一条连续的路：房间地面 → 绳子 → 绳顶平台 → 台阶 → 电视 → 书 → 城堡
   相机把小猫钉在画面偏左，动的是环境；只有走到世界尽头（城堡）小猫才会自己走过去
   ============================================================ */
(() => {
  const INK = '#141414', CY = '#3ddbcb', GREY = '#cfcfcf', WHITE = '#ffffff';

  /* ---------- 世界坐标 ---------- */
  const CS = 3, CW = CAT.W * CS, CH = CAT.H * CS;

  /* 绳顶平台。这个数决定绳子有多长 —— 绳子是从 LV 垂到房间地面(0)的。
     要求「爬到第一个绳结时房间已经完全出画」，反推出来的：
     停住时可见区间是 [camY, camY+viewH]，camY = 猫y - ROPE_A*viewH，
     所以 猫y ≤ 房间最高处 - (1-ROPE_A)*viewH。viewH 最大 1174（H≈783，PX 恰好还没跳到 3 那一档），
     房间最高处是吊灯顶（含链条）= ROOM.lamp.y0 - CHAIN_LEN = -735 - 88 = -823，
     算下来猫要停在 -1527 以下；取 -1638（KNOT_Y[0] + KNOT_GAP），最坏窗口下还留 111 的余量。 */
  const LV = -3080;                     // 绳顶平台（比原来高 300：第三张教育卡挂在绳子上，尽头还要留一段空绳子给「爬上来」那个圈）
  const SH = 110;
  const LV2 = LV - SH * 3;              // 台阶顶 = 后面所有场景的地面

  const ROPE_X = 20, ROPE_CAT = ROPE_X - Math.floor(CW / 2) + 4;
  /* 绳结间距 = 教育卡片的行距，所以它由最高的那张卡决定，不能随便调小。
     本科那张带「排名 / 课程 / 概述」三块，实测 344 高（430px 宽的卡）——
     间距 380 留 36 的余量。**给卡片加内容前先量一遍高度**，超过 344 就要连着
     KNOT_Y / LV / PIX_Y0 一起往上推。KNOT_Y[0] 不能动：它和 KNOT_GAP 一起
     决定「爬到第一个绳结时房间已经完全出画」那个约束（停在 -1638）。 */
  const KNOT_Y = [-1820, -2200, -2580], KNOT_GAP = 182;  // 停在绳结下面一点，不挡住热点
  const TOP_GAP = 300;                                  // 最后一段停在平台下面这么远（比 KNOT_GAP 大，好留出那截空绳子）
  /* 点第 i 个绳结 → 小猫爬到 EDU_DEST(i) 停住，第 i 段教育就挂在那儿。
     卡片顶对齐小猫的头顶（脚在 cat.y，身高 CH），所以文字是「浮在小猫旁边」，
     不是浮在它爬过的半路上。卡片往下长，所以间距要大于最高的那张（见上）。 */
  /* 第三段没有第四个绳结，平台就是那个「绳结」—— 同样挂在它下面一个 KNOT_GAP 处。
     所以三张卡都是「小猫吊在绳子上、卡片浮在它旁边」，没有一张站在地上。 */
  const EDU_DEST = (i) => (i < 2 ? KNOT_Y[i + 1] + KNOT_GAP : LV + TOP_GAP);
  /* 第三段停得比绳结那两段更靠下 —— 头顶要留出一截空绳子，「爬上来」那个圈画在那儿 */
  const TOP_SPOT = LV + 84;
  const EDU_TOP = (i) => EDU_DEST(i) - CH - 10;

  const ST_X = 1345, SW = 700;
  const STEP_TOP = [LV - SH, LV - SH * 2, LV - SH * 3];
  /* 小猫停在每一级的**外侧**（刚迈上来的那个边沿），不停在台面正中。
     镜头把小猫钉在画面 26% 处 —— 也就是小猫左边只看得到 .26 × viewW 那么宽
     （1500 的窗口约 390）。实习卡片是左对齐在这一级的立面上的，
     小猫要是停在台面正中（离立面 350+），那张卡就有一截被左边框切掉；
     停在外侧，卡片正好落在小猫右上方，画面也更居中。
     热点画在同一个位置 —— 它就是「小猫要走到的那个点」。 */
  const STEP_PAD = 110;
  const STEP_MARK = (i) => ST_X + SW * i + STEP_PAD;
  const STEP_STOP = (i) => STEP_MARK(i) - CW / 2;

  const TV_X = 4560, TV_W = 380, TV_H = 419;    // 世界里那台电视（画在 canvas 上）
  const BOOK_X = 5900;
  /* 地上那本手账本（assets/book.png，棕色外壳的实拍图）。
     只给高度，宽度按原图比例算 —— 换图不会变形。小猫高 132，本子比它矮一截。 */
  const BOOK_H = 106, BOOK_W = Math.round(BOOK_H * (324 / 440));
  const CAS_X = 7000;
  /* 06 城堡正面：真实素材。宽高按原图比例锁死，门的位置是从图里量出来的百分比。 */
  const CASTLE = { x: CAS_X, h: 720, ar: 1091 / 1263,
                   door: { l: .42, t: .72, w: .22, h: .28 } };
  CASTLE.w = CASTLE.h * CASTLE.ar;
  const GATE_X = CAS_X + CASTLE.w * (CASTLE.door.l + CASTLE.door.w / 2);
  const WORLD_R = 7800;

  const IN_X0 = 10000, IN_X1 = 11380, PILLAR_X = 10620;   // 城堡内部（另一处空间）
  /* 名片柱 + 柱子上那束光，也都是真实素材 */
  const PILLAR = { h: 260, ar: 444 / 1146 };
  PILLAR.w = PILLAR.h * PILLAR.ar;
  /* 光是从头顶打下来的，不该看见光源。素材里锥尖那一截已经切掉、顶部又渐隐成全透明，
     所以怎么裁都不会露出一个起点。高度还要够长：最矮的一档窗口地面以上只看得到约 675
     （GROUND_A * viewH），锥体底在名片上方 247，所以至少要 428 才能把顶端顶出画面。 */
  /* 光锥：素材里锥尖已经切掉、顶部又渐隐成全透明，所以看不见光源。
     高度必须让渐隐段在画面内走完 —— 锥底在名片上方 247，最矮的一档窗口地面以上
     只看得到约 675（GROUND_A * viewH），所以 h 不能超过 428，取 420。
     再高的话顶端会被画面切掉，反而露出一条硬边。
     宽度不按原图比例（0.658），横向压窄到 0.40 —— 等于收小光锥的张角；
     照原比例画出来是一大团没有形状的雾。 */
  const LIGHT = { h: 420, ar: .40 };
  LIGHT.w = LIGHT.h * LIGHT.ar;
  /* 柱顶那只信封（assets/envelope.png，实拍图，四角就是信封本身，没有白底要抠）。
     只给高度，宽度按原图比例算 —— 换图不会变形。点开它才是名片。 */
  const CARD_H = 68, CARD_W = Math.round(CARD_H * (618 / 420));
  /* 信封中心。原来贴着柱顶（+10 是压进柱头一点），现在整个浮起来一截，
     底下留出空气，像是被那束光托着 —— 光锥是跟着这个数走的，改它就一起动。 */
  const CARD_CY = LV2 - PILLAR.h - CARD_H / 2 + 10 - 44;

  const ANCH_X = .26, GROUND_A = .86;   // 小猫钉在画面偏左 / 地面钉在画面偏下
  /* 爬绳子时镜头的竖向锚点从 GROUND_A 平滑抬到 ROPE_A（小猫在画面里越爬越高）。
     不能一上绳就切档 —— 那样地面会「往上弹一下」。
     过渡距离 = CLIMB_R × viewH，这个比例必须大于 (GROUND_A - ROPE_A)，
     否则过渡期间地面在画面里会往回走；.55 > .46，留了余量。 */
  const ROPE_A = .40, CLIMB_R = .55;
  /* 开场文字的理想高度。原来贴在画面很上方，现在压到画面中段（吊灯下方、小猫上方）——
     字少了，靠顶会显得整块飘着。矮窗口仍然由 fitTop 兜底往下压。 */
  const INTRO_Y = -470;

  /* ---------- 01 房间的真实素材 ----------
     全是照片，所以不进像素缓冲，直接画在主画布上（跟电视一样）。
     宽高按原图比例锁死：只给一个边，另一边算出来，换图不会变形。 */
  const AR = {                                   // 原图宽 / 高
    lamp: 879 / 622,                             // chandelier.png 里灯体那一块
    mona: 697 / 1000, veil: 778 / 1000, vase: 626 / 760,
  };
  const LAMP_SRC = { x: 11, y: 250, w: 879, h: 622 };   // 灯体在 chandelier.png 里的位置（自带的短链条不要）
  /* 整组的右边界压在 1356，1440x900 那种笔记本也能把花瓶看全 */
  const ROOM = {
    lamp: { cx: 552, y0: -735, y: -735, w: 205 },   // 吊灯：cx 是中心，y0 是理想高度，y 每次 resize 兜底（见 fitTop）
    art: [                                       // 两幅画竖向中线对齐在 -355
      { src: 'assets/oil-mona.jpg', x: 680, y: -510, h: 310, ar: AR.mona },
      { src: 'assets/oil-veil.jpg', x: 922, y: -484, h: 258, ar: AR.veil },
    ],
    vase: { x: 1148, h: 252 },                   // 底在地面上
  };
  ROOM.lamp.h = ROOM.lamp.w / AR.lamp;
  /* 窗口一矮，地面上方能看到的世界就变少（GROUND_A * viewH，常见窗口在 600~1000 之间浮动），
     顶上的东西会被挤出画面。fitTop 的做法是：正常窗口用设计好的世界坐标，
     只有当它离画面顶边不足 padPx 时，才把它往下压到刚好留出 padPx。
     房间里镜头是锁死的，所以按房间的静止机位算一次就行；爬绳子时镜头升上去，
     这些东西还是老老实实留在世界里往下走。 */
  const fitTop = (y0, padPx) => Math.max(y0, -GROUND_A * viewH + padPx / SCALE);
  const LAMP_PAD = 70, INTRO_PAD = 62;
  ROOM.art.forEach((a) => { a.w = a.h * a.ar; });
  ROOM.vase.w = ROOM.vase.h * AR.vase;
  ROOM.vase.y = -ROOM.vase.h;


  const CHAPS = [
    ['01', '房间'], ['02', '教育'], ['03', '实习'],
    ['04', '项目'], ['05', '兴趣'], ['06', '联系'],
  ];
  const PHASE_CH = { room: 0, rope: 1, stairs: 2, tv: 3, book: 4, castle: 5, inner: 5 };

  /* ---------- 元素 ---------- */
  const stage = document.getElementById('stage');
  const cv = document.getElementById('world');
  const ctx = cv.getContext('2d');
  const layer = document.getElementById('layer');
  const hintEl = document.getElementById('hint');
  const tipEl = document.getElementById('tip');
  const countEl = document.getElementById('count');
  const chapEl = document.getElementById('chapters');
  const guideEl = document.getElementById('guide');
  const loadEl = document.getElementById('loading');
  const loadTxt = document.getElementById('loadingTxt');
  const tvzoom = document.getElementById('tvzoom');
  const bookzoom = document.getElementById('bookzoom');
  const bookTabs = document.getElementById('bookTabs');
  const cardzoom = document.getElementById('cardzoom');

  /* ---------- 状态 ---------- */
  let W = 0, H = 0, SCALE = 1, viewW = 0, viewH = 0, DPR = 1;
  /* 像素缓冲：世界里所有「我画的」东西先画进这张低分辨率画布，
     再用最近邻放大贴上去 —— 线条自然就是像素的。
     1 缓冲像素 = 3 世界像素 = 1 个小猫的像素格（CS=3），所以小猫刚好对齐网格。 */
  const K = 3;
  let PX = 3, bw = 0, bh = 0;
  const buf = document.createElement('canvas');
  const g = buf.getContext('2d', { willReadFrequently: true });
  let camX = -140, camY = -700, tgtX = -140, tgtY = -700;
  let camA = GROUND_A;                 // 当前的竖向锚点，见 ROPE_A / CLIMB_R
  let camXr = -140, camYr = -700;      // 对齐到像素网格后的相机
  let hover = null, guide = null;
  let region = { x0: -440, x1: WORLD_R };

  const st = {
    phase: 'room', started: false, drop: 0, dropping: false,
    edu: -1, intern: -1, tab: 0, top: false,
    tvSeen: 0, tvOn: false, book: false, card: false, inCastle: false,
  };
  const doneCh = new Set();

  const cat = { x: 240, y: 0, dir: 1, mode: 'idle', t: 0, plan: [], rope: false, up: false, hold: false, blink: 0, blinkAt: 2 };

  /* ============================================================
     像素绘制层
     所有线条都直接点像素，1 缓冲像素 = K 世界像素 = 小猫精灵的 1 格，
     所以世界和小猫共用同一套像素网格。静态部分一次性画进 pix 大图，
     每帧只是按整数偏移裁一块贴过来 —— 不缩放、不插值，边缘是硬的。
     ============================================================ */
  const PIX_X0 = -702, PIX_Y0 = -4110, PIX_X1 = 11700, PIX_Y1 = 123;
  const pixW = Math.round((PIX_X1 - PIX_X0) / K), pixH = Math.round((PIX_Y1 - PIX_Y0) / K);
  const pix = document.createElement('canvas');
  pix.width = pixW; pix.height = pixH;
  const pctx = pix.getContext('2d');

  let T = null, TOX = 0, TOY = 0;                 // 当前目标 + 原点（缓冲像素）
  const aim = (c, ox, oy) => { T = c; TOX = ox; TOY = oy; };
  const bx = (w) => Math.round(w / K) + TOX;
  const by = (w) => Math.round(w / K) + TOY;
  const bn = (w) => Math.max(1, Math.round(w / K));

  function ph(x0, x1, y, c = INK) {               // 横线
    const a = bx(x0), b = bx(x1);
    T.fillStyle = c; T.fillRect(Math.min(a, b), by(y), Math.abs(b - a) + 1, 1);
  }
  function pv(x, y0, y1, c = INK) {               // 竖线
    const a = by(y0), b = by(y1);
    T.fillStyle = c; T.fillRect(bx(x), Math.min(a, b), 1, Math.abs(b - a) + 1);
  }
  function pl(x0, y0, x1, y1, c = INK) {          // 斜线（Bresenham）
    let i = bx(x0), j = by(y0);
    const i1 = bx(x1), j1 = by(y1);
    const dx = Math.abs(i1 - i), dy = -Math.abs(j1 - j);
    const sx = i < i1 ? 1 : -1, sy = j < j1 ? 1 : -1;
    let err = dx + dy;
    T.fillStyle = c;
    for (let n = 0; n < 4000; n++) {
      T.fillRect(i, j, 1, 1);
      if (i === i1 && j === j1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; i += sx; }
      if (e2 <= dx) { err += dx; j += sy; }
    }
  }
  const pbox = (x, y, w, h, c = INK) => { ph(x, x + w, y, c); ph(x, x + w, y + h, c); pv(x, y, y + h, c); pv(x + w, y, y + h, c); };
  const pfill = (x, y, w, h, c) => { T.fillStyle = c; T.fillRect(bx(x), by(y), bn(w), bn(h)); };
  function pring(cx, cy, r, c = INK) {            // 圆环
    const R = Math.max(1, Math.round(r / K)), ci = bx(cx), cj = by(cy);
    let x = R, y = 0, e = 1 - R;
    T.fillStyle = c;
    const s = (i, j) => T.fillRect(i, j, 1, 1);
    while (x >= y) {
      s(ci + x, cj + y); s(ci + y, cj + x); s(ci - y, cj + x); s(ci - x, cj + y);
      s(ci - x, cj - y); s(ci - y, cj - x); s(ci + y, cj - x); s(ci + x, cj - y);
      y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
    }
  }
  function pdisc(cx, cy, r, c = INK) {
    const R = Math.max(1, Math.round(r / K)), ci = bx(cx), cj = by(cy);
    T.fillStyle = c;
    for (let j = -R; j <= R; j++) { const w = Math.floor(Math.sqrt(R * R - j * j)); T.fillRect(ci - w, cj + j, 2 * w + 1, 1); }
  }

  /* ============================================================
     搭世界（一次性画进 pix）
     ============================================================ */
  function buildArt() {
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, pixW, pixH);
    aim(pctx, -Math.round(PIX_X0 / K), -Math.round(PIX_Y0 / K));

    /* --- 01 房间：地面是直的 --- */
    ph(-700, 1560, 0);

    /* --- 02/03 绳顶平台 + 台阶：全是直线 --- */
    ph(ROPE_X - 160, ST_X, LV);
    pv(ST_X, LV - SH, LV);
    ph(ST_X, ST_X + SW, LV - SH);
    pv(ST_X + SW, LV - SH * 2, LV - SH);
    ph(ST_X + SW, ST_X + SW * 2, LV - SH * 2);
    pv(ST_X + SW * 2, LV - SH * 3, LV - SH * 2);
    ph(ST_X + SW * 2, WORLD_R + 300, LV - SH * 3);
    // 平台左端的断面
    pl(ROPE_X - 160, LV, ROPE_X - 184, LV + 36, '#c9c9c9');
    pl(ROPE_X - 118, LV, ROPE_X - 132, LV + 27, '#c9c9c9');
    // 绳子顶端的挂钩
    pbox(ROPE_X - 21, LV - 27, 48, 21);

    /* --- 06 城堡正面：真实素材，画在主画布上（见 drawCastle）--- */

    /* --- 城堡内部 --- */
    ph(IN_X0 - 300, IN_X1 + 300, LV2);
    // 名片柱也是真实素材（见 drawCastle）
  }

  /* ============================================================
     每帧的像素小东西（绳子会伸缩、书和名片会被捡走）
     ============================================================ */
  const easeBack = (t) => { const c = 1.24; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function drawRope() {
    if (st.drop <= 0) return;
    const yEnd = LV + (0 - LV) * Math.min(1.02, easeBack(Math.min(1, st.drop)));
    pv(ROPE_X, LV, yEnd); pv(ROPE_X + 6, LV, yEnd);
    for (let y = LV + 15; y < yEnd - 12; y += 24) { pfill(ROPE_X, y, 3, 3, INK); pfill(ROPE_X + 3, y + 12, 3, 3, INK); }
  }

  /* 热点画在主画布上，不做像素化 */
  function drawSpots() {
    const pulse = 1 + Math.sin(cat.t * 3) * .07;
    for (const s of spots) {
      if (!s.live()) continue;
      if (s.shape === 'circle') {
        const cx = (s.x - camXr) * SCALE, cy = (s.y - camYr) * SCALE, r = s.r * SCALE * pulse;
        ctx.strokeStyle = CY;
        if (s.tie != null) {
          ctx.beginPath(); ctx.moveTo((s.tie - camXr) * SCALE, cy); ctx.lineTo(cx - r - 5, cy);
          ctx.lineWidth = 1.4; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r + 9 * SCALE, 0, 7);
        ctx.strokeStyle = 'rgba(61,219,203,.32)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 3.4 * SCALE, 0, 7); ctx.fillStyle = CY; ctx.fill();
      } else if (s === hover || s.mark) {
        const x = (s.x - camXr) * SCALE, y = (s.y - camYr) * SCALE;
        const w = s.w * SCALE, h = s.h * SCALE, L = 15;
        ctx.strokeStyle = CY; ctx.lineWidth = 2.2;
        ctx.beginPath();
        [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) => {
          ctx.moveTo(a + sx * L, b - sy * 5); ctx.lineTo(a - sx * 5, b - sy * 5); ctx.lineTo(a - sx * 5, b + sy * L);
        });
        ctx.stroke();
      }
    }
  }

  /* ============================================================
     小猫
     ============================================================ */
  /* 绳子底下同一个 x 有两层地面，用 cat.up 区分小猫在楼下还是绳顶那层 */
  function groundAt(x) {
    if (cat.up && x >= IN_X0 - 400) return LV2;
    if (!cat.up) return 0;   // 楼下：房间地面
    if (x < ST_X) return LV;
    if (x < ST_X + SW) return LV - SH;
    if (x < ST_X + SW * 2) return LV - SH * 2;
    return LV2;
  }

  function tick(dt) {
    cat.t += dt;
    cat.blinkAt -= dt;
    if (cat.blinkAt <= 0) { cat.blink = .12; cat.blinkAt = 2.4 + Math.random() * 4; }
    if (cat.blink > 0) cat.blink -= dt;

    if (st.dropping) {
      st.drop = Math.min(1, st.drop + dt / 1.15);
      if (st.drop >= 1) { st.dropping = false; onRopeReady(); }
    }

    const a = cat.plan[0];
    if (!a) {
      cat.mode = 'idle';
      if (!cat.rope) cat.y = groundAt(cat.x + CW / 2);
    } else if (a.t === 'walk') {
      cat.mode = 'walk';
      const d = a.x - cat.x, s = 500 * dt;
      if (Math.abs(d) > 1) cat.dir = Math.sign(d);
      if (Math.abs(d) <= s) { cat.x = a.x; cat.plan.shift(); } else cat.x += Math.sign(d) * s;
      if (!cat.rope) cat.y = groundAt(cat.x + CW / 2);
    } else if (a.t === 'climb') {
      cat.mode = 'climb';
      const d = a.y - cat.y, s = 460 * dt;
      if (Math.abs(d) <= s) { cat.y = a.y; cat.plan.shift(); } else cat.y += Math.sign(d) * s;
    } else if (a.t === 'do') { cat.plan.shift(); a.fn(); }
  }

  function catImg() {
    let set;
    if (cat.mode === 'walk') set = CAT.walk;
    else if (cat.mode === 'climb' || cat.rope) set = CAT.climb;
    else set = cat.hold ? (cat.blink > 0 ? CAT.holdBlink : CAT.hold) : (cat.blink > 0 ? CAT.idleBlink : CAT.idle);
    const i = cat.mode === 'walk' ? Math.floor(cat.t * 9) % 4
      : cat.mode === 'climb' ? Math.floor(cat.t * 5) % 2
        : cat.rope ? 0                              // 爬到位就抓着不动，不再来回倒手
          : (Math.sin(cat.t * 2) > .7 ? 1 : 0);
    return set[i % set.length];
  }

  function drawCat() {
    const img = catImg();
    const sx = Math.round((cat.x - camXr) * SCALE / PX) * PX;
    const sy = Math.round((cat.y - CH - camYr) * SCALE / PX) * PX;
    const w = CAT.W * PX, h = CAT.H * PX;
    ctx.save();
    if (cat.dir < 0) { ctx.translate(sx + w, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
    else ctx.drawImage(img, sx, sy, w, h);
    ctx.restore();
  }


  /* ============================================================
     热点
     ============================================================ */
  const spots = [];
  function buildSpots() {
    spots.length = 0;
    const add = (o) => { o.live = o.live || (() => true); spots.push(o); };

    // 房间里的两幅画（只在绳子还没掉下来时可点）
    ROOM.art.forEach((f, i) => add({
      id: 'fr' + i, shape: 'rect', x: f.x, y: f.y, w: f.w, h: f.h, label: '看看这幅',
      live: () => !st.started,
      act: () => { document.getElementById('cap' + i).classList.add('on'); ropeTimer = setTimeout(dropRope, 900); },
    }));

    // 绳结：只有小猫正停在它那一档时亮
    KNOT_Y.forEach((y, i) => add({
      id: 'kn' + i, shape: 'circle', x: ROPE_X + 3, y, r: 18, label: '往上爬一段',
      live: () => st.phase === 'rope' && st.edu === i,
      act: () => knot(i),
    }));

    // 绳子尽头：第三段看完之后才亮，点了才真的爬上平台
    add({
      id: 'top', shape: 'circle', x: ROPE_X + 3, y: TOP_SPOT, r: 18, label: '爬上来',
      live: () => st.phase === 'rope' && st.top,
      act: climbTop,
    });

    // 台阶
    STEP_TOP.forEach((top, i) => add({
      id: 'sp' + i, shape: 'circle', x: STEP_MARK(i), y: top - 44, r: 17, label: '上一级',
      live: () => st.phase === 'stairs' && st.intern === i,
      act: () => step(i),
    }));

    // 电视（世界里就一台，屏幕是雪花的）
    add({
      id: 'tv', shape: 'rect', x: TV_X - TV_W / 2, y: LV2 - TV_H, w: TV_W, h: TV_H,
      label: '打开电视', live: () => st.phase === 'tv', mark: true,
      act: () => goTo(TV_X - TV_W / 2 - CW - 40, openTV),
    });

    // 书
    add({
      id: 'book', shape: 'rect',
      x: BOOK_X - BOOK_W / 2 - 12, y: LV2 - BOOK_H - 8, w: BOOK_W + 24, h: BOOK_H + 8, label: '捡起来',
      live: () => st.phase === 'book', mark: true,
      act: () => {
        goTo(BOOK_X - CW - 30, () => {
          hideBubble();
          cat.hold = true;
          if (!st.book) { st.book = true; done(4); }
          setTab(st.tab); bookzoom.classList.add('on');
        });
      },
    });

    // 城堡门
    add({
      id: 'gate', shape: 'rect',
      x: CASTLE.x + CASTLE.w * CASTLE.door.l, y: LV2 - CASTLE.h * (1 - CASTLE.door.t),
      w: CASTLE.w * CASTLE.door.w, h: CASTLE.h * CASTLE.door.h, label: '推门进去',
      live: () => st.phase === 'castle', mark: true,
      act: () => goTo(GATE_X - CW / 2, enterCastle),
    });

    // 柱子上的名片
    add({
      id: 'card', shape: 'rect',
      x: PILLAR_X - CARD_W / 2 - 6, y: CARD_CY - CARD_H / 2 - 6, w: CARD_W + 12, h: CARD_H + 12,
      label: '捡起名片',
      live: () => st.phase === 'inner', mark: true,          // 放回去之后还能再看一次
      act: () => goTo(PILLAR_X - CW - 86, () => {
        openCard();
        if (!st.card) { st.card = true; done(5); }
      }),
    });
  }

  function hitTest(wx, wy) {
    for (let i = spots.length - 1; i >= 0; i--) {
      const s = spots[i];
      if (!s.live()) continue;
      if (s.shape === 'circle') { if (Math.hypot(wx - s.x, wy - s.y) < s.r + 15) return s; }
      else if (wx > s.x && wx < s.x + s.w && wy > s.y && wy < s.y + s.h) return s;
    }
    return null;
  }

  /* ============================================================
     流程
     ============================================================ */
  function goTo(x, then) {
    cat.plan.length = 0;
    cat.plan.push({ t: 'walk', x });
    if (then) cat.plan.push({ t: 'do', fn: then });
  }

  function tip(s) { tipEl.textContent = s; }

  /* dir 四档：
     rope  箭头贴在**绳子**右侧、小猫头顶上方一截 —— 它指的是那根绳子，
           不是小猫，所以锚在 ROPE_X 上（小猫这会儿还站在离绳子挺远的地方）
     up    箭头浮在小猫头顶
     right 箭头贴在小猫右边（走两步）
     end   钉在画面最右侧 —— 用在「这一段看完了，往下一幕」，
           它不属于世界里的某个位置，所以不跟着小猫走 */
  let guideDir = 'up';
  function showGuide(dir, label, act) {
    guide = act; guideDir = dir;
    guideEl.className = 'guide on ' +
      (dir === 'end' ? 'right end' : dir === 'rope' ? 'up' : dir);
    guideEl.querySelector('.arrow').textContent =
      (dir === 'up' || dir === 'rope') ? '↑' : '→';
    guideEl.querySelector('em').textContent = label;
    placeGuide();
  }
  function hideGuide() { guide = null; guideEl.className = 'guide'; }

  /* 箭头永远贴在小猫身边，朝它接下来要走的方向；end 那一档除外 */
  function placeGuide() {
    if (!guide) return;
    if (guideDir === 'end') {                    // 视口坐标，和世界无关
      guideEl.style.left = (W - 96) + 'px';
      guideEl.style.top = Math.round(H * .5) + 'px';
      return;
    }
    const sx = (cat.x - camXr) * SCALE, sy = (cat.y - camYr) * SCALE;
    const w = CW * SCALE, h = CH * SCALE;
    if (guideDir === 'rope') {                   // 贴着绳子，在小猫头顶上方一截
      guideEl.style.left = ((ROPE_X - camXr) * SCALE + 46) + 'px';
      guideEl.style.top = Math.max(110, sy - h - 130 * SCALE) + 'px';
      return;
    }
    if (guideDir === 'up') {
      guideEl.style.left = (sx + w / 2) + 'px';
      guideEl.style.top = Math.max(96, sy - h - 52) + 'px';
    } else {
      guideEl.style.left = (sx + w + 62) + 'px';
      guideEl.style.top = (sy - h / 2) + 'px';
    }
  }

  /* ---------- 小猫头上的气泡 ---------- */
  /* 和箭头一样是视口层的 DOM，每帧跟着小猫的屏幕坐标走。
     只在「该动手了」的地方出现（电视 / 手账本），不用来讲内容。 */
  const bubbleEl = document.getElementById('bubble');
  let bubbleOn = false;
  function showBubble(text) {
    bubbleEl.querySelector('span').textContent = text;
    bubbleOn = true; placeBubble();
    bubbleEl.classList.add('on');
  }
  function hideBubble() { bubbleOn = false; bubbleEl.classList.remove('on'); }
  function placeBubble() {
    if (!bubbleOn) return;
    const sx = (cat.x - camXr) * SCALE, sy = (cat.y - camYr) * SCALE;
    bubbleEl.style.left = (sx + CW * SCALE / 2) + 'px';
    bubbleEl.style.top = Math.max(112, sy - CH * SCALE - 14) + 'px';
  }
  guideEl.onclick = () => { const g = guide; hideGuide(); if (g) g();  };

  const show = (id) => { const n = document.getElementById(id); if (n) n.classList.add('on'); };
  const hide = (id) => { const n = document.getElementById(id); if (n) n.classList.remove('on'); };

  function done(i) {
    doneCh.add(i);
    paintChapters();
  }

  /* --- 01 房间：点任意位置，绳子掉下来 --- */
  function dropRope() {
    if (st.started) return;
    st.started = true;
    hide('intro'); hide('cap0'); hide('cap1');
    done(0);
    st.dropping = true;
    tip('有根绳子掉下来了');
  }
  function onRopeReady() {
    st.phase = 'rope';
    paintChapters();
    tip('点箭头，小猫会顺着绳子往上爬');
    showGuide('rope', '往上爬', () => {
      cat.plan.length = 0;
      cat.plan.push({ t: 'walk', x: ROPE_CAT });
      cat.plan.push({ t: 'do', fn: () => { cat.rope = true; } });
      cat.plan.push({ t: 'climb', y: KNOT_Y[0] + KNOT_GAP });
      cat.plan.push({ t: 'do', fn: () => { st.edu = 0; tip('点亮绳结上的圆圈，看看这一段'); } });
    });
  }

  /* --- 02 绳子 --- */
  function knot(i) {
    st.edu = -1;                       // 爬的过程中先熄灭
    cat.plan.length = 0;
    cat.plan.push({ t: 'do', fn: () => show('ed' + i) });
    cat.plan.push({ t: 'climb', y: EDU_DEST(i) });   // 终点只有 EDU_DEST 一处说了算
    cat.plan.push({
      t: 'do', fn: () => {
        if (i < 2) { st.edu = i + 1; tip('再点下一个绳结'); }
        else {
          st.top = true;                 // 绳子尽头那个圈亮起来
          tip('这一段看完了 —— 点绳子尽头那个圈，爬上平台');
        }
      }
    });
  }

  /* 爬完最后那截空绳子，踩上平台。踩稳之后「继续向前」才出现 —— 在绳子上时不给。 */
  function climbTop() {
    st.top = false;
    cat.plan.length = 0;
    cat.plan.push({ t: 'climb', y: LV });
    cat.plan.push({
      t: 'do', fn: () => {
        cat.rope = false;              // 踩上平台就松手
        cat.up = true;
        done(1);
        tip('到顶了 —— 右边是一层平台');
        showGuide('end', '继续向前', toStairs);
      }
    });
  }

  function toStairs() {
    ['ed0', 'ed1', 'ed2'].forEach(hide);
    st.phase = 'stairs'; paintChapters();
    goTo(ST_X - 300, () => { st.intern = 0; tip('点台阶上的圆圈，一级一级上去'); });
  }

  /* --- 03 台阶 --- */
  function step(i) {
    st.intern = -1;
    goTo(STEP_STOP(i), () => {
      show('in' + i);
      if (i < 2) { st.intern = i + 1; tip('继续往上'); }
      else {
        done(2);
        tip('三段实习看完了');
        showGuide('end', '继续向前', toTV);
      }
    });
  }

  function toTV() {
    ['in0', 'in1', 'in2'].forEach(hide);
    st.phase = 'tv'; paintChapters();
    goTo(TV_X - 420, () => {
      tip('前面有台坏掉的电视 —— 点一下试试');
      showBubble('咦？这里有个电视，看看里边有什么吧～');
      /* 往下一幕的箭头等看完电视再出（见 closeOverlay） */
    });
  }

  function toBook() {
    st.phase = 'book'; paintChapters();
    goTo(BOOK_X - 520, () => {
      tip('前面地上有本书，走过去捡起来');
      showBubble('咦？这里有个笔记本，捡起来看看里边有什么吧～');
      /* 往城堡的箭头等合上手账本再出（见 closeOverlay） */
    });
  }

  function toCastle() {
    hideBubble();
    st.phase = 'castle'; paintChapters();
    goTo(CAS_X - 320, () => tip('到尽头了 —— 点城堡的门进去'));
  }

  /* --- 06 城堡：进门 → loading → 内部 --- */
  let castleTimer = 0, ropeTimer = 0;      // 两个待执行的定时器，空降时要取消掉
  function enterCastle() {
    loadEl.classList.add('on');
    loadTxt.textContent = '推开城堡的门…';
    castleTimer = setTimeout(() => {
      region = { x0: IN_X0 - 80, x1: IN_X1 };
      cat.x = IN_X0 + 120; cat.y = LV2; cat.dir = 1; cat.plan.length = 0;
      st.phase = 'inner'; st.inCastle = true;
      camX = tgtX = IN_X0 - 80; camA = GROUND_A; camY = tgtY = LV2 - viewH * GROUND_A;
      camXr = Math.round(camX / K) * K; camYr = Math.round(camY / K) * K;
      paintChapters();
      tip('中间那根柱子上，好像放着什么');
      render();
      setTimeout(() => loadEl.classList.remove('on'), 260);
    }, 1150);
  }

  /* ============================================================
     覆盖层
     ============================================================ */
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* 手账本：每一页就是一张图，正文都画在里面了。第一次打开时把五张全预热，翻页才不会闪 */
  const bookImg = document.getElementById('bookImg');
  let bookWarm = false;
  function setTab(i) {
    st.tab = i;
    const h = C.hobbies[i];
    if (!bookWarm) { bookWarm = true; C.hobbies.forEach((o) => { const im = new Image(); im.src = o.img; }); }
    bookImg.src = h.img;
    bookImg.alt = h.alt;
    [...bookTabs.children].forEach((b, k) => b.classList.toggle('on', k === i));
  }

  /* ---------- 电视：雪花 → 开机 → 桌面 → 文件夹 → 弹窗 ---------- */
  const SNOW = ['assets/static1.jpg', 'assets/static2.jpg', 'assets/static3.jpg', 'assets/static4.jpg'];
  const snowImg = SNOW.map((u) => { const im = new Image(); im.src = u; return im; });
  const tvImg = new Image(); tvImg.src = 'assets/tv.png';
  const blissImg = new Image(); blissImg.src = 'assets/bliss.jpg';
  const SCR = { l: .0903, t: .3430, w: .6336, h: .4711 };   // 屏幕开口在 tv.png 里的位置

  /* 世界里那台电视：素材是照片，所以直接画在主画布上（不进像素缓冲），
     而且画在小猫之前 —— 小猫从它前面走过 */
  function drawWorldTV() {
    const x = (TV_X - TV_W / 2 - camXr) * SCALE, y = (LV2 - TV_H - camYr) * SCALE;
    const w = TV_W * SCALE, h = TV_H * SCALE;
    if (x > W + 20 || x + w < -20) return;
    const sx = x + w * SCR.l, sy = y + h * SCR.t, sw = w * SCR.w, sh = h * SCR.h;
    const src = st.tvOn ? blissImg : snowImg[snowI];
    if (src.complete && src.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
      ctx.drawImage(src, sx, sy, sw, sh);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let yy = 0; yy < sh; yy += 3) ctx.fillRect(sx, sy + yy, sw, 1);
      ctx.restore();
    }
    if (tvImg.complete && tvImg.naturalWidth) ctx.drawImage(tvImg, x, y, w, h);
  }

  /* ---------- 01 房间：吊灯 / 两幅油画 / 百合 ---------- */
  const loadImg = (u) => { const i = new Image(); i.src = u; return i; };
  const lampImg = loadImg('assets/chandelier.png');
  const vaseImg = loadImg('assets/lilies.png');
  const artImg = ROOM.art.map((a) => loadImg(a.src));

  const ready = (im) => im.complete && im.naturalWidth > 0;
  /* 世界坐标 → 屏幕，顺手把画面外的东西跳过 */
  function place(x, y, w, h) {
    const sx = (x - camXr) * SCALE, sy = (y - camYr) * SCALE;
    const sw = w * SCALE, sh = h * SCALE;
    if (sx > W + 40 || sx + sw < -40 || sy > H + 40 || sy + sh < -40) return null;
    return [sx, sy, sw, sh];
  }

  /* 吊灯上面那截链条：不接天花板，就短短一段，让灯浮在世界里。
     链条长度和 ROOM.lamp.y0 是一对：房间最高处 = y0 - CHAIN_LEN，
     这个值又反过来定绳子要多长（见顶部 LV 那段注释）。灯往上抬多少，
     链条最好就缩多少，房间顶就不会变 —— 现在 -735-88 = -823，比原来只高 8。 */
  const CHAIN_LEN = 88;
  function drawChain(cx, yBottom) {
    const x = (cx - camXr) * SCALE;
    if (x < -30 || x > W + 30) return;
    const y1 = (yBottom - camYr) * SCALE, y0 = y1 - CHAIN_LEN * SCALE;
    if (y1 < -40 || y0 > H + 40) return;
    const lw = Math.max(1.2, ROOM.lamp.w * .026 * SCALE);
    const step = lw * 1.9;
    ctx.strokeStyle = '#9d7f4c';
    ctx.lineWidth = Math.max(.9, lw * .3);
    for (let y = y1, k = 0; y > y0 && k < 60; y -= step, k++) {
      ctx.beginPath();
      ctx.ellipse(x, y - step / 2, k % 2 ? lw * .5 : lw * .17, step * .47, 0, 0, 7);
      ctx.stroke();
    }
  }

  const castleImg = loadImg('assets/castle.webp');
  const pillarImg = loadImg('assets/pillar.webp');
  const lightImg = loadImg('assets/spotlight.webp');
  const bookImgW = loadImg('assets/book.png');
  const envImg = loadImg('assets/envelope.png');

  /* 地上那本手账本：真实素材，立在地面上（跟城堡 / 柱子一样直接画在主画布，不像素化）。
     捡走之后就不画了（st.book）。宽高按原图比例锁死，换图不会变形。 */
  function drawGroundBook() {
    if (st.book) return;
    const b = place(BOOK_X - BOOK_W / 2, LV2 - BOOK_H, BOOK_W, BOOK_H);
    if (b && ready(bookImgW)) ctx.drawImage(bookImgW, b[0], b[1], b[2], b[3]);
  }

  /* 城堡正面、名片柱、柱子上那束光：都是照片，跟房间里那几样一样直接画在主画布上。
     光束就用普通的 alpha 叠加 —— 底色是近白的，screen 混合会让这束光直接消失。 */
  function drawCastle() {
    const c = place(CASTLE.x, LV2 - CASTLE.h, CASTLE.w, CASTLE.h);
    if (c && ready(castleImg)) ctx.drawImage(castleImg, c[0], c[1], c[2], c[3]);

    const px = PILLAR_X - PILLAR.w / 2, py = LV2 - PILLAR.h;
    const cardY = CARD_CY;                                // 信封中心（浮在柱顶上方）
    const lb = place(PILLAR_X - LIGHT.w / 2, cardY + 30 - LIGHT.h, LIGHT.w, LIGHT.h);
    if (lb && ready(lightImg)) {
      ctx.save();
      ctx.globalAlpha = .85;
      ctx.drawImage(lightImg, lb[0], lb[1], lb[2], lb[3]);
      ctx.restore();
    }
    const pb = place(px, py, PILLAR.w, PILLAR.h);
    if (pb && ready(pillarImg)) ctx.drawImage(pillarImg, pb[0], pb[1], pb[2], pb[3]);

    /* 柱顶那只信封 —— 一直在，看完名片放回去还是它 */
    const eb = place(PILLAR_X - CARD_W / 2, cardY - CARD_H / 2, CARD_W, CARD_H);
    if (eb && ready(envImg)) ctx.drawImage(envImg, eb[0], eb[1], eb[2], eb[3]);
  }

  function drawRoom() {
    ROOM.art.forEach((a, i) => {
      const b = place(a.x, a.y, a.w, a.h);
      if (b && ready(artImg[i])) ctx.drawImage(artImg[i], b[0], b[1], b[2], b[3]);
    });
    const v = place(ROOM.vase.x, ROOM.vase.y, ROOM.vase.w, ROOM.vase.h);
    if (v && ready(vaseImg)) ctx.drawImage(vaseImg, v[0], v[1], v[2], v[3]);

    const L = ROOM.lamp;
    drawChain(L.cx, L.y);
    const b = place(L.cx - L.w / 2, L.y, L.w, L.h);
    if (b && ready(lampImg)) {
      ctx.drawImage(lampImg, LAMP_SRC.x, LAMP_SRC.y, LAMP_SRC.w, LAMP_SRC.h, b[0], b[1], b[2], b[3]);
    }
  }

  const tvScreen = document.getElementById('tvScreen');
  const tvSnow = document.getElementById('tvSnow');
  const tvFlash = document.getElementById('tvFlash');
  const tvIcons = document.getElementById('tvIcons');
  const tvWin = document.getElementById('tvWin');
  const winTitle = document.getElementById('winTitle');
  const winBody = document.getElementById('winBody');
  let snowI = 0;

  setInterval(() => {
    snowI = (snowI + 1) % SNOW.length;
    tvSnow.style.backgroundImage = `url(${SNOW[snowI]})`;
  }, 110);

  tvIcons.innerHTML = C.projects.map((p, i) =>
    `<button data-i="${i}"><img src="assets/folder.png" alt=""><span>${esc(p.short)}</span></button>`).join('');
  tvIcons.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) openWin(+b.dataset.i);
  });

  function openWin(i) {
    const p = C.projects[i];
    winTitle.textContent = `${p.ch}  —  ${p.title}`;
    // 有图的项目，图放在标题下面、正文上面；没有图的（AR 博物馆导览）就直接进正文
    const shot = p.img
      ? `<figure class="shot"><img src="${esc(p.img)}" alt="${esc(p.alt || p.title)}" loading="lazy">
          ${p.cap ? `<figcaption>${esc(p.cap)}</figcaption>` : ''}</figure>`
      : '';
    winBody.innerHTML = `<h3>${esc(p.title)}</h3><div class="meta">${esc(p.meta)}</div>
      ${shot}
      ${p.p.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${p.kpi.length ? `<div class="kpi">${p.kpi.map((k) => `<span>${esc(k)}</span>`).join('')}</div>` : ''}`;
    winBody.scrollTop = 0;
    tvWin.classList.add('on');
  }
  const closeWin = () => tvWin.classList.remove('on');
  document.getElementById('winClose').onclick = (e) => { e.stopPropagation(); closeWin(); };
  document.getElementById('desktop').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'desktop') closeWin();
  });

  function openTV() {
    hideBubble();
    closeWin();
    tvScreen.classList.remove('on');
    tvzoom.classList.add('on');
    if (st.tvSeen === 0) done(3);
    st.tvSeen++;
    // 开机：雪花闪一下 → 桌面亮起来
    setTimeout(() => {
      tvFlash.classList.remove('go'); void tvFlash.offsetWidth; tvFlash.classList.add('go');
      tvScreen.classList.add('on');
      st.tvOn = true;
      tip('九个文件夹，一个项目一个 · 左边一列是 AI 相关的');
    }, 620);
  }

  function openCard() {
    const c = C.card;
    const img = document.getElementById('namecardImg');
    img.src = c.img; img.alt = c.alt;
    document.getElementById('cardNote').textContent = c.note;
    cardzoom.classList.add('on');
  }

  /* 只收起来，不做别的 —— 空降换幕时用这个，
     否则会顺手把「继续向前」的箭头也放出来，把刚摆好的状态搅乱。 */
  function dismissOverlays() {
    tvzoom.classList.remove('on');
    bookzoom.classList.remove('on');
    cardzoom.classList.remove('on');
  }

  /* 关掉覆盖层不只是收起来：电视和手账本都是「这一幕的正事」，
     看完了才把往下一幕的箭头放出来（钉在画面最右侧）。 */
  function closeOverlay() {
    const wasTV = tvzoom.classList.contains('on');
    const wasBook = bookzoom.classList.contains('on');
    dismissOverlays();

    if (wasTV && st.phase === 'tv') {
      hideBubble();
      tip('电视看完了');
      showGuide('end', '继续向前', toBook);
    }
    if (wasBook && st.phase === 'book') {
      cat.hold = false;                 // 手账本收起来了，别再抱着
      tip('手账本看完了');
      showBubble('手账本里有一个钥匙！再往前走走看看吧！');
      showGuide('end', '继续向前', toCastle);
    }
  }
  document.getElementById('tvClose').onclick = closeOverlay;
  document.getElementById('bookClose').onclick = closeOverlay;
  document.getElementById('cardClose').onclick = closeOverlay;
  [tvzoom, bookzoom, cardzoom].forEach((n) => { n.onclick = (e) => { if (e.target === n) closeOverlay(); }; });

  bookTabs.innerHTML = C.hobbies.map((h, i) =>
    `<button data-i="${i}" aria-label="${esc(h.tab)}" title="${esc(h.tab)}"></button>`).join('');
  bookTabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(+b.dataset.i); });

  /* ============================================================
     世界里的 DOM 文字
     ============================================================ */
  function el(html, x, y, id) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    const n = d.firstElementChild;
    n.style.left = x + 'px'; n.style.top = y + 'px';
    if (id) n.id = id;
    layer.appendChild(n);
    return n;
  }

  /* 卡片顶上那一行：左边机构标识，右边身份小牌。
     标识默认是褪掉的墨色，等这张卡片亮起来（.tx.on）才慢慢回到品牌色 ——
     整站只有青色一个高音，品牌色是被允许的第二个，但要小、要晚、要克制。
     没有 logo 图的用 mark 兜一个墨线字符牌，位置和高度跟 logo 完全一样。 */
  function orgRow(e) {
    const left = e.logo
      ? `<img class="logo" src="${esc(e.logo)}" alt="${esc(e.title)}" draggable="false">`
      : (e.mark ? `<span class="mark">${esc(e.mark)}</span>` : '');
    const chips = [e.badge, e.tier].filter(Boolean)
      .map((t, i) => `<span class="badge${i ? ' tier' : ''}">${esc(t)}</span>`).join('');
    return `<div class="org">${left}<span class="chips">${chips}</span></div>`;
  }

  /* 排名 / 课程 / 方向这些「维度」：左边一个窄标签，右边内容，一行一条。
     标签用等宽字体压成灰的，正文才是主角。 */
  function infoRows(e) {
    if (!e.rows || !e.rows.length) return '';
    return `<dl class="rows">${e.rows.map(([k, v]) =>
      `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  }

  function buildDOM() {
    layer.innerHTML = '';

    el(`<div class="tx big">
      <h1>${esc(C.intro.h)}</h1>
      ${C.intro.p.map((t) => `<p>${esc(t)}</p>`).join('')}
      <div class="go"><i>✳</i> ${esc(C.intro.hint)}</div>
    </div>`, 150, Math.round(fitTop(INTRO_Y, INTRO_PAD)), 'intro');

    ROOM.art.forEach((f, i) => {
      el(`<div class="cap"><b>${esc(C.frames[i].cap)}</b>${esc(C.frames[i].note)}</div>`,
        f.x + f.w / 2 - 100, f.y + f.h + 18, 'cap' + i);
    });

    C.edu.forEach((e, i) => {
      el(`<div class="tx">
        ${orgRow(e)}
        <h3>${esc(e.title)}</h3>
        <div class="meta">${esc(e.meta)}</div>
        ${infoRows(e)}
        ${e.sum ? `<p class="sum">${esc(e.sum)}</p>` : ''}
      </div>`, ROPE_X + 140, EDU_TOP(i), 'ed' + i);
    });

    C.intern.forEach((e, i) => {
      el(`<div class="tx wide">
        ${orgRow(e)}
        <h3>${esc(e.title)}</h3>
        <div class="meta">${esc(e.meta)}</div>
        ${infoRows(e)}
        ${e.sum ? `<p class="sum">${esc(e.sum)}</p>` : ''}
      </div>`, ST_X + SW * i, STEP_TOP[i] - 520, 'in' + i);
    });

    setTimeout(() => show('intro'), 300);
  }

  /* ============================================================
     顶栏 / 底栏
     ============================================================ */
  function buildChapters() {
    chapEl.innerHTML = CHAPS.map(([n, t], i) =>
      `<button data-i="${i}"><i>${n}</i>${t}</button>`).join('');
    chapEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) jumpTo(+b.dataset.i);
    });
  }

  /* 顶栏点一下就空降过去 —— 六幕本来是一条要一步步走完的路，
     但看的人未必想重走一遍。每一幕这里都把状态摆成「刚走到这儿」的样子，
     镜头直接吸附过去，不做位移动画（这个菜单存在的意义就是别再等了）。 */
  function jumpTo(i) {
    /* 进城堡的 loading 和「点画浮字后掉绳子」都是延时触发的，
       不取消的话它们会在空降之后才执行，把刚摆好的状态又改回去。 */
    clearTimeout(castleTimer); clearTimeout(ropeTimer);
    loadEl.classList.remove('on');
    dismissOverlays();
    hideGuide(); hideBubble();
    cat.plan.length = 0;
    ['intro', 'cap0', 'cap1', 'ed0', 'ed1', 'ed2', 'in0', 'in1', 'in2'].forEach(hide);
    st.edu = -1; st.intern = -1; st.top = false;
    st.inCastle = false;
    region = { x0: -440, x1: WORLD_R };
    cat.dir = 1;

    if (i === 0) {                       // 01 房间：回到最开始那一屏
      st.phase = 'room'; st.started = false; st.dropping = false; st.drop = 0;
      cat.rope = false; cat.up = false; cat.x = 240; cat.y = 0;
      show('intro'); tip(C.intro.hint);
    } else {
      st.started = true; st.dropping = false; st.drop = 1;
      if (i === 1) {                     // 02 教育：挂在第一个绳结下面
        st.phase = 'rope';
        cat.rope = true; cat.up = false;
        cat.x = ROPE_CAT; cat.y = KNOT_Y[0] + KNOT_GAP;
        st.edu = 0; tip('点亮绳结上的圆圈，看看这一段');
      } else {
        cat.rope = false; cat.up = true;
        if (i === 2) {                   // 03 实习：绳顶平台，台阶前
          st.phase = 'stairs'; cat.x = ST_X - 300; cat.y = LV;
          st.intern = 0; tip('点台阶上的圆圈，一级一级上去');
        } else if (i === 3) {            // 04 项目：电视前
          st.phase = 'tv'; cat.x = TV_X - 420; cat.y = LV2;
          tip('前面有台坏掉的电视 —— 点一下试试');
          showBubble('咦？这里有个电视，看看里边有什么吧～');
        } else if (i === 4) {            // 05 兴趣：书前
          st.phase = 'book'; cat.x = BOOK_X - 520; cat.y = LV2;
          tip('前面地上有本书，走过去捡起来');
          showBubble('咦？这里有个笔记本，捡起来看看里边有什么吧～');
        } else {                         // 06 联系：城堡门口
          st.phase = 'castle'; cat.x = CAS_X - 320; cat.y = LV2;
          tip('到尽头了 —— 点城堡的门进去');
        }
      }
    }
    snapCam();
    paintChapters();
  }

  /* 镜头瞬间吸到小猫身上（含爬绳时那套竖向锚点），不走 lerp */
  function snapCam() {
    const up = clamp((groundAt(cat.x) - cat.y) / (CLIMB_R * viewH), 0, 1);
    camA = GROUND_A + (ROPE_A - GROUND_A) * up;
    const right = Math.max(region.x0, region.x1 - viewW);
    camX = tgtX = clamp(cat.x + CW / 2 - viewW * ANCH_X, region.x0, right);
    camY = tgtY = cat.y - viewH * camA;
    camXr = Math.round(camX / K) * K; camYr = Math.round(camY / K) * K;
    layer.style.transform = `scale(${SCALE}) translate(${-camXr}px,${-camYr}px)`;
  }
  function paintChapters() {
    const cur = PHASE_CH[st.phase];
    [...chapEl.children].forEach((n, i) => {
      n.classList.toggle('on', i === cur);
      n.classList.toggle('done', doneCh.has(i) && i !== cur);
    });
    countEl.textContent = `${String(doneCh.size).padStart(2, '0')} / 06`;
  }

  /* ============================================================
     指针
     ============================================================ */
  /* 画面不给拖、不给滚、不给方向键 —— 镜头永远跟着小猫。
     想去别的地方走顶栏的章节菜单，那才是唯一的导航方式。
     指针事件只剩下「点」和「悬浮找热点」这两件事。 */
  const toWorld = (e) => {
    const r = cv.getBoundingClientRect();
    return [camXr + (e.clientX - r.left) / SCALE, camYr + (e.clientY - r.top) / SCALE];
  };

  stage.addEventListener('pointermove', (e) => {
    const [wx, wy] = toWorld(e);
    const s = hitTest(wx, wy);
    hover = s;
    stage.classList.toggle('hot', !!s);
    if (s) {
      hintEl.textContent = s.label;
      hintEl.style.left = e.clientX + 'px'; hintEl.style.top = e.clientY + 'px';
      hintEl.classList.add('on');
    } else hintEl.classList.remove('on');
  });

  stage.addEventListener('click', (e) => {
    if (e.target !== cv) return;
    const [wx, wy] = toWorld(e);
    const s = hitTest(wx, wy);
    if (s) { s.act(); return; }
    if (st.phase === 'room') dropRope();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });

  /* ============================================================
     主循环
     ============================================================ */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function advance(dt) {
    tick(dt);
    {
      tgtX = cat.x + CW / 2 - viewW * ANCH_X;
      const up = clamp((groundAt(cat.x) - cat.y) / (CLIMB_R * viewH), 0, 1);
      const want = GROUND_A + (ROPE_A - GROUND_A) * up;
      /* 往上爬（want 变小）直接取值：只要不滞后，地面就只会往下走，不会回弹。
         爬到顶踩上平台时 want 会一下子跳回 GROUND_A，那一下才做时间缓动，滑过去而不是切过去。 */
      camA = want < camA ? want : camA + (want - camA) * Math.min(1, dt * 3);
      tgtY = cat.y - viewH * camA;
    }
    const right = Math.max(region.x0, region.x1 - viewW);
    tgtX = clamp(tgtX, region.x0, right);
    const k = Math.min(1, dt * 7);
    camX += (tgtX - camX) * k; camY += (tgtY - camY) * k;
    camXr = Math.round(camX / K) * K; camYr = Math.round(camY / K) * K;
    layer.style.transform = `scale(${SCALE}) translate(${-camXr}px,${-camYr}px)`;
    placeGuide();
    placeBubble();
  }

  function render() {
    // 1) 世界：从 pix 大图里按整数偏移裁一块，1:1 贴进缓冲（不缩放，边缘是硬的）
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.imageSmoothingEnabled = false;
    const sx = Math.round(camXr / K) - Math.round(PIX_X0 / K);
    const sy = Math.round(camYr / K) - Math.round(PIX_Y0 / K);
    g.drawImage(pix, sx, sy, bw, bh, 0, 0, bw, bh);

    // 2) 会动的像素小东西
    aim(g, -Math.round(camXr / K), -Math.round(camYr / K));
    drawRope();

    // 3) 最近邻放大贴到主画布
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, bw, bh, 0, 0, bw * PX, bh * PX);

    // 4) 真实素材：房间里的吊灯 / 油画 / 百合，还有那台电视
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    drawRoom();
    drawCastle();
    drawGroundBook();
    drawWorldTV();

    // 5) 小猫（像素，对齐网格，走在电视前面）
    ctx.imageSmoothingEnabled = false;
    drawCat();

    // 6) 热点：不像素化，画在最上层
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    drawSpots();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.045, (now - last) / 1000); last = now;
    advance(dt); render();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     尺寸 / 启动
     ============================================================ */
  function resize() {
    W = innerWidth; H = innerHeight; DPR = Math.min(2, devicePixelRatio || 1);
    // 让 1 缓冲像素 = 整数个屏幕像素，放大后才不会糊
    PX = clamp(Math.round(H / 940 * K), 2, 5);
    SCALE = PX / K;
    viewW = W / SCALE; viewH = H / SCALE;
    ROOM.lamp.y = Math.round(fitTop(ROOM.lamp.y0, LAMP_PAD + CHAIN_LEN * SCALE));  // 矮窗口把吊灯往下压，链条也要留出来
    const it = document.getElementById('intro');               // 开场文字同理，别贴到顶栏上
    if (it) it.style.top = Math.round(fitTop(INTRO_Y, INTRO_PAD)) + 'px';
    bw = Math.ceil(W / PX) + 1; bh = Math.ceil(H / PX) + 1;
    buf.width = bw; buf.height = bh;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }

  window.addEventListener('resize', resize);
  resize();
  buildArt(); buildSpots(); buildDOM(); buildChapters(); paintChapters();
  camX = tgtX = cat.x + CW / 2 - viewW * ANCH_X;
  camY = tgtY = -viewH * GROUND_A;
  camXr = Math.round(camX / K) * K; camYr = Math.round(camY / K) * K;
  layer.style.transform = `scale(${SCALE}) translate(${-camXr}px,${-camYr}px)`;
  tip(C.intro.hint);
  requestAnimationFrame((t) => { last = t; loop(t); });

  /* 调试（面板不可见时 rAF 会停）：__d.step(秒) / __d.run('kn0') */
  window.__d = {
    cat, st, spots, goTo,
    run: (id) => { const s = spots.find((q) => q.id === id); if (s) s.act(); },
    tap: () => guideEl.click(),
    step(sec = 1) { const h = 1 / 60; for (let i = 0; i < sec / h; i++) advance(h); camX = tgtX; camY = tgtY; camXr = Math.round(camX / K) * K; camYr = Math.round(camY / K) * K; layer.style.transform = `scale(${SCALE}) translate(${-camXr}px,${-camYr}px)`; render(); },
    cam: () => ({ camX: camXr, camY: camYr, SCALE, viewW, viewH }),
  };
})();
