<script>
  // 3D wave mesh background
  // Port of src/reference/wave-mesh-standalone.html into a Svelte component
  // that sizes to its container (not the viewport) so it can live inside a
  // section's .section-bg slot. The canvas is transparent; the section
  // decides what sits behind it.
  //
  // Behaviour preserved from the standalone:
  //   - Pinhole camera, wireframe grid on the XZ plane.
  //   - Each grid point's height = sum of four sines; waves scroll toward
  //     the camera via z + t * SCROLL_RATE.
  //   - Depth fog fades far lines.
  //
  // Added for site integration:
  //   - pointer-events: none (set via CSS) so it never blocks clicks.
  //   - Pauses while document.hidden.
  //   - Freezes at a single frame if prefers-reduced-motion: reduce.
  //   - Theme-aware stroke color (oklch hue ~215, matching the site accent)
  //     instead of the standalone's neon-green.
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

  /* ---------- Tuning (from the reference) ---------- */
  const CELL       = 45;
  const HALF_WIDTH = 1100;
  const NEAR_Z     = 40;
  const FAR_Z      = 2200;
  const PITCH      = 0.42;
  const CAM_Y      = 180;
  const FOCAL      = 700;
  const TIME_STEP  = 0.012;
  const SCROLL_RATE = 30;
  const LINE_ALPHA = 0.6;
  const LINE_WIDTH = 1;

  const COLS = Math.round((HALF_WIDTH * 2) / CELL) + 1;
  const ROWS = Math.round((FAR_Z - NEAR_Z)   / CELL) + 1;
  const cosP = Math.cos(PITCH);
  const sinP = Math.sin(PITCH);

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

  function waveHeight(x, z, tt) {
    const nx = x / 400;
    const nz = z / 400;
    return (
      Math.sin(nx * 2.0 + tt * 0.6) * 34 +
      Math.sin(nz * 1.5 - tt * 0.4) * 44 +
      Math.sin(nx * 3.5 + nz * 2.0 + tt * 0.9) * 22 +
      Math.sin(nx * 0.8 - nz * 1.2 + tt * 0.3) * 28
    );
  }

  function project(x, y, z) {
    const yc = y - CAM_Y;
    const yr =  yc * cosP + z * sinP;
    const zr = -yc * sinP + z * cosP;
    if (zr < 1) return null;
    const sx = cssW / 2 + (x  * FOCAL) / zr;
    const sy = cssH / 2 - (yr * FOCAL) / zr;
    return { sx, sy, depth: zr };
  }

  function fog(depth) {
    const k = 1 - (depth - NEAR_Z) / (FAR_Z - NEAR_Z);
    return Math.max(0.05, Math.min(1, k));
  }

  function draw() {
    if (!ctx) return;
    if (cssW === 0 || cssH === 0) return;
    ctx.clearRect(0, 0, cssW, cssH);

    // Site-accent hue (oklch 215). Darker in light mode so the mesh is
    // visible against near-white; brighter in dark mode so it reads.
    const baseColor = theme === 'dark' ? '0.82 0.14 215' : '0.5 0.1 215';

    const zScroll = t * SCROLL_RATE;

    // Build projected grid in one pass so both longitudinal and transverse
    // lines reuse the same projected points.
    const grid = new Array(ROWS);
    for (let j = 0; j < ROWS; j++) {
      const row = new Array(COLS);
      const z = NEAR_Z + j * CELL;
      for (let i = 0; i < COLS; i++) {
        const x = -HALF_WIDTH + i * CELL;
        const y = waveHeight(x, z + zScroll, t);
        row[i] = project(x, y, z);
      }
      grid[j] = row;
    }

    ctx.lineWidth = LINE_WIDTH;

    // Longitudinal lines (fixed column, varying row — "depth lines").
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS - 1; j++) {
        const a = grid[j][i], b = grid[j + 1][i];
        if (!a || !b) continue;
        const alpha = fog((a.depth + b.depth) / 2) * LINE_ALPHA;
        ctx.strokeStyle = `oklch(${baseColor} / ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }

    // Transverse lines (fixed row, varying column — "rungs").
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS - 1; i++) {
        const a = grid[j][i], b = grid[j][i + 1];
        if (!a || !b) continue;
        const alpha = fog((a.depth + b.depth) / 2) * LINE_ALPHA;
        ctx.strokeStyle = `oklch(${baseColor} / ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }
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

  // Redraw when theme changes so the color updates immediately even if
  // the animation is paused (reduced motion, hidden tab).
  $: if (ctx && theme) draw();
</script>

<canvas bind:this={canvas} class="bg-canvas" aria-hidden="true"></canvas>
