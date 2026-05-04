<script>
  // Noise-modulated sine wave field
  // Canvas-based background. Stacks horizontal lines, each a sum of sines,
  // amplitude-modulated by a slow pseudo-noise field so "active" and "calm"
  // regions roam across the canvas over time.
  //
  // Integration notes:
  //   - Transparent canvas: overlays on whatever is painted behind it.
  //   - pointer-events: none (set via CSS) so it never blocks clicks.
  //   - Pauses on document.hidden.
  //   - Freezes at a static frame if prefers-reduced-motion: reduce.
  //   - Scales down line count + sample step on narrow viewports.
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

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Size to the canvas's current CSS box (driven by its container via CSS:
    // width: 100%; height: 100%), so the field can live inside a section
    // and scroll with it rather than being a fixed, viewport-wide layer.
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (!ctx) return;
    const w = cssW;
    const h = cssH;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);

    // Device/viewport-based tuning
    const narrow = w < 720;
    const LINES = narrow ? 20 : 35;
    const STEP = narrow ? 6 : 4;

    const dark = theme === 'dark';
    // Stroke hue aligns with the site's accent (oklch hue ~215). Lightness
    // chosen so lines sit subtly on the bg-stage gradient in both themes.
    const baseColor = dark ? '0.82 0.12 215' : '0.35 0.08 220';

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < LINES; i++) {
      const progress = i / (LINES - 1);
      const baseY = progress * h;
      const envelope = Math.sin(progress * Math.PI);

      // Outer lines dimmer, middle lines more present.
      const alpha = 0.18 + envelope * 0.4;
      ctx.strokeStyle = `oklch(${baseColor} / ${alpha.toFixed(3)})`;

      ctx.beginPath();
      for (let x = 0; x <= w; x += STEP) {
        const nx = x / w;

        // Cheap pseudo-noise: sum of three sines at different scales.
        // Bias by +0.3 and clamp >= 0 so the modulator is positive-only —
        // activity is the default, calm is rare, lines never invert.
        let n =
          Math.sin(nx * 1.1 + progress * 0.7 + t * 0.35) +
          Math.sin(nx * 2.3 - progress * 1.4 + t * 0.25) * 0.6 +
          Math.sin(nx * 0.5 + progress * 2.1 - t * 0.20) * 0.4;
        n = n / 2;
        const noiseMod = Math.max(0, n + 0.3);

        // Sum-of-sines y displacement
        let dy =
          Math.sin(nx * 7 + t * 0.9 + progress * 2) * 30 +
          Math.sin(nx * 3 - t * 0.5 + progress * 1.5) * 20;

        // Envelope flattens top/bottom; noise modulates amplitude locally.
        dy *= envelope * noiseMod;

        const y = baseY + dy;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function tick() {
    rafId = null;
    if (paused || reducedMotion) return;
    t += 0.01;
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
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
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
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // Leave a static frame visible.
        draw();
      } else {
        ensureRunning();
      }
    };

    // Observe the canvas itself — fires when its container (and therefore
    // the canvas's CSS size) changes, including on viewport resize.
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

  // Redraw when theme changes so colors update immediately even if animation
  // is paused (reduced motion, hidden tab). Harmless if animation is running.
  $: if (ctx && theme) draw();
</script>

<canvas bind:this={canvas} class="bg-canvas" aria-hidden="true"></canvas>
