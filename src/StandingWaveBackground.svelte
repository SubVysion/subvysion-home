<script>
  // Standing wave field background
  // Port of src/reference/standing-wave-standalone.html into a Svelte
  // component. The math (height field, peak drift, marching-squares
  // contouring) is preserved verbatim; the integration shape is the same
  // as NoiseSineBackground / WaveMeshBackground:
  //   - container-sized canvas (clientWidth/clientHeight + ResizeObserver)
  //   - pauses while document.hidden
  //   - freezes at a static frame under prefers-reduced-motion: reduce
  //   - theme-aware oklch stroke (hue 215, matching the site accent)
  //     instead of the standalone's neon-green-yellow rgba.
  // pointer-events: none is set via CSS so the canvas never blocks clicks.
  import { onMount } from 'svelte';

  export let theme = 'light';

  let canvas;
  let ctx = null;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let t = 0;
  let rafId = null;
  let paused = false;
  let reducedMotion = false;

  // Preallocated grid; reallocated only when canvas dimensions change.
  let grid = null;
  let gridCols = 0;
  let gridRows = 0;

  /* ---------- Tuning (from the reference) ---------- */
  const CELL = 5;
  const LEVELS = [
    -0.5, -0.35, -0.2, -0.05, 0.1, 0.25, 0.4, 0.55,
     0.7,  0.85,  1.0,  1.15,
  ];
  // Slowed from the standalone's 0.012 — for an ambient background the
  // contours should drift, not march. Lowering TIME_STEP uniformly slows
  // both peak drift and the standing-wave temporal oscillation.
  const TIME_STEP = 0.005;
  const LINE_WIDTH = 1;

  // Peak definitions (verbatim from the standalone).
  const PEAKS = [
    { hx: 0.20, hy: 0.30, dx: 0.03, dy: 0.02, px: 0.0, py: 1.3, sigma: 0.28, k: 18, omega: 1.6, amp: 0.6  },
    { hx: 0.45, hy: 0.65, dx: 0.04, dy: 0.03, px: 2.1, py: 0.5, sigma: 0.26, k: 22, omega: 1.4, amp: 0.55 },
    { hx: 0.70, hy: 0.30, dx: 0.03, dy: 0.04, px: 3.4, py: 2.8, sigma: 0.30, k: 16, omega: 1.8, amp: 0.65 },
    { hx: 0.85, hy: 0.70, dx: 0.04, dy: 0.02, px: 1.2, py: 4.0, sigma: 0.24, k: 20, omega: 1.5, amp: 0.5  },
  ];

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function field(x, y, tt, scale, ww, hh) {
    let sum = 0;
    for (let i = 0; i < PEAKS.length; i++) {
      const p = PEAKS[i];
      const cx = (p.hx + Math.cos(tt * 0.3 + p.px) * p.dx) * ww;
      const cy = (p.hy + Math.sin(tt * 0.25 + p.py) * p.dy) * hh;
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const r2 = dx * dx + dy * dy;
      const r  = Math.sqrt(r2);
      const env = Math.exp(-r2 / (2 * p.sigma * p.sigma));
      const wave = 1 + p.amp * Math.sin(p.k * r) * Math.sin(p.omega * tt);
      sum += env * wave;
    }
    return sum;
  }

  function lerp(a, b, k) {
    return (k - a) / (b - a);
  }

  function drawContours(cols, rows, baseColor) {
    for (let li = 0; li < LEVELS.length; li++) {
      const k = LEVELS[li];
      // Brighter near the middle of the level range, dimmer at extremes.
      const distFromMid = Math.abs(li - LEVELS.length / 2) / (LEVELS.length / 2);
      const alpha = 0.18 + (1 - distFromMid) * 0.4;
      ctx.strokeStyle = `oklch(${baseColor} / ${alpha.toFixed(3)})`;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const tl = grid[j * cols + i];
          const tr = grid[j * cols + (i + 1)];
          const br = grid[(j + 1) * cols + (i + 1)];
          const bl = grid[(j + 1) * cols + i];
          let idx = 0;
          if (tl > k) idx |= 1;
          if (tr > k) idx |= 2;
          if (br > k) idx |= 4;
          if (bl > k) idx |= 8;
          if (idx === 0 || idx === 15) continue;
          const x0 = i * CELL, y0 = j * CELL;
          const x1 = x0 + CELL, y1 = y0 + CELL;
          const topX    = x0 + CELL * lerp(tl, tr, k);
          const rightY  = y0 + CELL * lerp(tr, br, k);
          const bottomX = x0 + CELL * lerp(bl, br, k);
          const leftY   = y0 + CELL * lerp(tl, bl, k);
          const topY    = y0;
          const rightX  = x1;
          const bottomY = y1;
          const leftX   = x0;
          switch (idx) {
            case 1:  ctx.moveTo(leftX, leftY);   ctx.lineTo(topX, topY);       break;
            case 2:  ctx.moveTo(topX, topY);     ctx.lineTo(rightX, rightY);   break;
            case 3:  ctx.moveTo(leftX, leftY);   ctx.lineTo(rightX, rightY);   break;
            case 4:  ctx.moveTo(rightX, rightY); ctx.lineTo(bottomX, bottomY); break;
            case 5:
              ctx.moveTo(leftX, leftY);   ctx.lineTo(topX, topY);
              ctx.moveTo(rightX, rightY); ctx.lineTo(bottomX, bottomY);        break;
            case 6:  ctx.moveTo(topX, topY);     ctx.lineTo(bottomX, bottomY); break;
            case 7:  ctx.moveTo(leftX, leftY);   ctx.lineTo(bottomX, bottomY); break;
            case 8:  ctx.moveTo(leftX, leftY);   ctx.lineTo(bottomX, bottomY); break;
            case 9:  ctx.moveTo(topX, topY);     ctx.lineTo(bottomX, bottomY); break;
            case 10:
              ctx.moveTo(topX, topY);     ctx.lineTo(rightX, rightY);
              ctx.moveTo(leftX, leftY);   ctx.lineTo(bottomX, bottomY);        break;
            case 11: ctx.moveTo(rightX, rightY); ctx.lineTo(bottomX, bottomY); break;
            case 12: ctx.moveTo(leftX, leftY);   ctx.lineTo(rightX, rightY);   break;
            case 13: ctx.moveTo(topX, topY);     ctx.lineTo(rightX, rightY);   break;
            case 14: ctx.moveTo(leftX, leftY);   ctx.lineTo(topX, topY);       break;
          }
        }
      }
      ctx.stroke();
    }
  }

  function draw() {
    if (!ctx) return;
    if (cssW === 0 || cssH === 0) return;
    ctx.clearRect(0, 0, cssW, cssH);

    // Bluer hue (oklch 240 — closer to pure blue than the site-accent
    // 215 which sits between cyan and blue). Slight chroma bump on top
    // for a more saturated, vivid feel. Darker in light mode so contours
    // read against the near-white panel; brighter in dark mode.
    const baseColor = theme === 'dark' ? '0.78 0.16 240' : '0.50 0.15 240';

    const cols = Math.ceil(cssW / CELL) + 1;
    const rows = Math.ceil(cssH / CELL) + 1;
    if (!grid || cols !== gridCols || rows !== gridRows) {
      grid = new Float32Array(cols * rows);
      gridCols = cols;
      gridRows = rows;
    }
    const scale = Math.min(cssW, cssH);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        grid[j * cols + i] = field(i * CELL, j * CELL, t, scale, cssW, cssH);
      }
    }
    ctx.lineWidth = LINE_WIDTH;
    drawContours(cols, rows, baseColor);
  }

  function tick() {
    rafId = null;
    if (paused || reducedMotion) return;
    t += TIME_STEP;
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function ensureRunning() {
    if (paused || reducedMotion) return;
    if (rafId == null) rafId = requestAnimationFrame(tick);
  }

  function onVisibility() {
    paused = document.hidden;
    if (paused) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      ensureRunning();
    }
  }

  function onResize() {
    resize();
    draw();
  }

  onMount(() => {
    ctx = canvas.getContext('2d');

    const mm = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = mm.matches;

    resize();
    draw();
    ensureRunning();

    const mmHandler = (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        draw();
      } else {
        ensureRunning();
      }
    };

    const ro = new ResizeObserver(() => onResize());
    ro.observe(canvas);

    document.addEventListener('visibilitychange', onVisibility);
    if (mm.addEventListener) mm.addEventListener('change', mmHandler);
    else if (mm.addListener) mm.addListener(mmHandler);

    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (mm.removeEventListener) mm.removeEventListener('change', mmHandler);
      else if (mm.removeListener) mm.removeListener(mmHandler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  });

  // Re-draw the current frame (no time step) when theme changes, so the
  // stroke color updates immediately even if the animation is paused.
  $: if (ctx && theme) draw();
</script>

<canvas bind:this={canvas} class="bg-canvas" aria-hidden="true"></canvas>
