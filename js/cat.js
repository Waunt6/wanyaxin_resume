/* ============================================================
   小猫侦探 · B5 圆脚版
   严格保留：猫耳 / 实心眼睛 / 单点鼻子 / 身体 / 四肢。
   每帧画进低分辨率 canvas，放大时关闭插值，保持真像素质感。
   ============================================================ */
(() => {
  const W = 34, H = 44;
  const INK = '#111111', WHITE = '#ffffff', CYAN = '#35dfd0';

  const newMask = () => new Uint8Array(W * H);
  const has = (m, x, y) => x >= 0 && x < W && y >= 0 && y < H && m[y * W + x] === 1;
  const set = (m, x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) m[y * W + x] = 1; };

  function rrect(m, x0, y0, x1, y1, r) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        let dx = 0, dy = 0;
        if (x < x0 + r) dx = x0 + r - x;
        if (x > x1 - r) dx = x - (x1 - r);
        if (y < y0 + r) dy = y0 + r - y;
        if (y > y1 - r) dy = y - (y1 - r);
        if (dx * dx + dy * dy <= r * r + r * .45) set(m, x, y);
      }
    }
  }

  function tri(m, a, b, c) {
    const minX = Math.min(a[0], b[0], c[0]), maxX = Math.max(a[0], b[0], c[0]);
    const minY = Math.min(a[1], b[1], c[1]), maxY = Math.max(a[1], b[1], c[1]);
    const sign = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const p = [x + .5, y + .5];
        const d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) set(m, x, y);
      }
    }
  }

  function disc(m, cx, cy, r) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy;
        if (dx * dx + dy * dy <= r * r) set(m, x, y);
      }
    }
  }

  function stamp(ctx, m) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!has(m, x, y)) continue;
      const edge = !has(m, x - 1, y) || !has(m, x + 1, y) || !has(m, x, y - 1) || !has(m, x, y + 1);
      ctx.fillStyle = edge ? INK : WHITE;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function fillMask(ctx, m, color) {
    ctx.fillStyle = color;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (has(m, x, y)) ctx.fillRect(x, y, 1, 1);
    }
  }

  const rect = (ctx, x0, y0, x1, y1, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  };

  // B5 Demo 的实际像素行。每行格式为 [y, x0, x1, x0, x1 ...]。
  // 固定像素避免圆角/三角形算法在浏览器里取整后改变轮廓或左右不对称。
  function addRows(m, rows, dx = 0, dy = 0) {
    for (const row of rows) {
      const y = row[0] + dy;
      for (let i = 1; i < row.length; i += 2) {
        for (let x = row[i]; x <= row[i + 1]; x++) set(m, x + dx, y);
      }
    }
  }

  const HEAD_ROWS = [
    [2, 6, 6, 27, 27], [3, 6, 7, 26, 27], [4, 5, 8, 25, 28],
    [5, 5, 9, 24, 28], [6, 5, 11, 22, 28], [7, 5, 12, 21, 28],
    [8, 4, 13, 20, 29], [9, 4, 29], [10, 4, 29], [11, 4, 29],
    [12, 3, 30], [13, 3, 30], [14, 3, 30], [15, 3, 30],
    [16, 3, 30], [17, 3, 30], [18, 3, 30], [19, 3, 30],
    [20, 3, 30], [21, 3, 30], [22, 3, 30], [23, 3, 30],
    [24, 3, 30], [25, 4, 29], [26, 4, 29], [27, 5, 28],
    [28, 6, 27], [29, 8, 25],
  ];

  const INNER_ROWS = [
    [6, 7, 7, 26, 26], [7, 7, 8, 25, 26], [8, 7, 10, 23, 26],
    [9, 7, 11, 22, 26], [10, 7, 7, 26, 26],
  ];

  const EYE_ROWS = [
    [18, 10, 12, 22, 24], [19, 9, 13, 21, 25], [20, 9, 13, 21, 25],
    [21, 9, 13, 21, 25], [22, 10, 12, 22, 24],
  ];

  const BODY_ROWS = [
    [28, 12, 21], [29, 10, 23], [30, 10, 23],
    [31, 9, 24], [32, 9, 24], [33, 9, 24], [34, 9, 24], [35, 9, 24],
    [36, 10, 23], [37, 10, 23], [38, 10, 23],
    [39, 10, 15, 18, 23], [40, 10, 15, 18, 23], [41, 11, 14, 19, 22],
  ];

  const LEFT_ARM_ROWS = [
    [30, 7, 8], [31, 6, 9], [32, 5, 10], [33, 5, 10],
    [34, 5, 10], [35, 5, 10], [36, 6, 9], [37, 7, 8],
  ];
  const RIGHT_ARM_ROWS = [
    [30, 25, 26], [31, 24, 27], [32, 23, 28], [33, 23, 28],
    [34, 23, 28], [35, 23, 28], [36, 24, 27], [37, 25, 26],
  ];

  function headMask() {
    const m = newMask();
    addRows(m, HEAD_ROWS);
    return m;
  }

  function drawHead(ctx, dy, blink) {
    ctx.save();
    ctx.translate(0, dy);
    stamp(ctx, headMask());

    // 蓝色缩在耳廓内部，不碰黑色描边。
    const inner = newMask();
    addRows(inner, INNER_ROWS);
    fillMask(ctx, inner, CYAN);

    if (blink) {
      rect(ctx, 9, 20, 13, 20, INK);
      rect(ctx, 21, 20, 25, 20, INK);
    } else {
      const eyes = newMask();
      addRows(eyes, EYE_ROWS);
      fillMask(ctx, eyes, INK);
    }

    // 两眼中轴上的一个像素点鼻子。
    rect(ctx, 17, 24, 17, 24, INK);
    ctx.restore();
  }

  function drawBackHead(ctx, dy) {
    ctx.save();
    ctx.translate(0, dy);
    stamp(ctx, headMask());

    // 攀绳时小猫面向绳子：不画正面的耳廓、眼睛和鼻子。
    // 后颈留一小段青色领口，让背影在白色场景里仍然清楚可辨。
    rect(ctx, 12, 27, 21, 27, CYAN);
    ctx.restore();
  }

  function drawBody(ctx, dy, arms) {
    ctx.save();
    ctx.translate(0, dy);

    const paws = newMask();
    const [al, ar] = arms || [0, 0];
    addRows(paws, LEFT_ARM_ROWS, 0, al);
    addRows(paws, RIGHT_ARM_ROWS, 0, ar);
    stamp(ctx, paws);

    const body = newMask();
    addRows(body, BODY_ROWS);
    stamp(ctx, body);
    ctx.restore();
  }

  function frame(paint) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    return canvas;
  }

  function stand(bob, blink, hold) {
    return frame((ctx) => {
      drawBody(ctx, bob, hold ? [-2, -2] : [0, 0]);
      drawHead(ctx, bob, blink);

      if (hold) {
        // 书是场景道具，不属于角色五官或装饰。
        const book = newMask();
        rrect(book, 7, 30, 26, 37, 1);
        stamp(ctx, book);
        rect(ctx, 8, 31, 25, 36, CYAN);
        rect(ctx, 16, 31, 17, 36, INK);
        rect(ctx, 10, 33, 14, 33, WHITE);
        rect(ctx, 19, 33, 23, 33, WHITE);
      }
    });
  }

  function walk(phase) {
    const bob = phase % 2 ? -1 : 0;
    const arms = phase === 0 ? [1, -1] : phase === 2 ? [-1, 1] : [0, 0];
    return frame((ctx) => {
      // 圆脚轮廓保持 B5 原样，用身体轻微起伏和摆臂表现走路。
      drawBody(ctx, bob, arms);
      drawHead(ctx, bob, false);
    });
  }

  function climb(phase) {
    const bob = phase ? -1 : 0;
    return frame((ctx) => {
      const body = newMask();
      addRows(body, BODY_ROWS);
      stamp(ctx, body);
      drawBackHead(ctx, bob);

      const arms = newMask();
      rrect(arms, 2, 14 + (phase ? 5 : 0), 7, 29, 2);
      rrect(arms, 26, 14 + (phase ? 0 : 5), 31, 29, 2);
      stamp(ctx, arms);
    });
  }

  window.CAT = {
    W, H, INK, WHITE, CYAN,
    idle: [stand(0, false, false), stand(-1, false, false)],
    idleBlink: [stand(0, true, false), stand(-1, true, false)],
    walk: [walk(0), walk(1), walk(2), walk(3)],
    climb: [climb(0), climb(1)],
    hold: [stand(0, false, true), stand(-1, false, true)],
    holdBlink: [stand(0, true, true), stand(-1, true, true)],
  };
})();
