<script>
  import { onMount } from "svelte";

  const CONTACT_EMAIL = "maxwell@subvysion.com";
  let scrollY = 0;
  let heroImage;
  let isScrolled = false;
  let shovelCursor;
  let shovelDirt;
  let shovelFling;

  const smoothScroll = (event) => {
    const href = event.currentTarget.getAttribute("href");
    if (href && href.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }
  };

  onMount(() => {
    const handleScroll = () => {
      scrollY = window.scrollY;
      if (heroImage) {
        heroImage.style.transform = `translateY(${scrollY * 0.08}px)`;
      }
      isScrolled = scrollY > 50;
    };

    const prefersFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!prefersFinePointer) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    document.body.classList.add("use-custom-cursor");

    let cursorX = 0;
    let cursorY = 0;
    let renderX = 0;
    let renderY = 0;
    let targetAngle = -35;
    let renderAngle = -35;
    let rafId = 0;
    let cursorVisible = false;
    let hoveringClickable = false;
    let digPhase = "idle";
    let phaseStartAt = 0;
    let aimFromAngle = -35;
    let aimToAngle = -35;
    const DIG_AIM_DURATION_MS = 140;
    const DIG_DURATION_MS = 260;
    const DIG_TOTAL_DURATION_MS = DIG_AIM_DURATION_MS + DIG_DURATION_MS;
    const clickableSelector = "a, button, input, textarea, select, label, [role='button'], [tabindex]:not([tabindex='-1'])";
    let replayingClick = false;
    let delayedClickTimeoutId = 0;

    const normalizeAngleDelta = (from, to) => {
      let delta = to - from;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      return delta;
    };

    const updateCursorVisibility = (isVisible) => {
      cursorVisible = isVisible;
      if (shovelCursor) {
        shovelCursor.style.opacity = cursorVisible ? "1" : "0";
      }
      const showDirt = cursorVisible && (hoveringClickable || digPhase !== "idle");
      if (shovelDirt) {
        shovelDirt.style.opacity = showDirt ? "1" : "0";
      }
      if (shovelFling && !cursorVisible) {
        shovelFling.style.opacity = "0";
      }
    };

    const renderCursor = () => {
      const now = performance.now();
      let digProgress = 0;
      let digDepth = 0;
      let upstrokeProgress = 0;
      let displayedAngle = renderAngle;

      if (digPhase === "aim") {
        const aimProgress = Math.min((now - phaseStartAt) / DIG_AIM_DURATION_MS, 1);
        const easedAimProgress = 1 - (1 - aimProgress) * (1 - aimProgress);
        const aimDelta = normalizeAngleDelta(aimFromAngle, aimToAngle);
        renderAngle = aimFromAngle + aimDelta * easedAimProgress;
        displayedAngle = renderAngle;
        if (aimProgress >= 1) {
          digPhase = "dig";
          phaseStartAt = now;
        }
      } else if (digPhase === "dig") {
        digProgress = Math.min((now - phaseStartAt) / DIG_DURATION_MS, 1);
        if (digProgress <= 0.45) {
          digDepth = Math.min(digProgress / 0.45, 1);
          upstrokeProgress = 0;
        } else {
          upstrokeProgress = Math.min((digProgress - 0.45) / 0.55, 1);
          digDepth = 1 - upstrokeProgress;
        }
        renderAngle = aimToAngle;
        displayedAngle = renderAngle + digDepth * 18;
        if (digProgress >= 1) {
          digPhase = "idle";
          if (shovelDirt) {
            shovelDirt.style.opacity = cursorVisible && hoveringClickable ? "1" : "0";
          }
          if (shovelFling) {
            shovelFling.style.opacity = "0";
          }
        }
      } else {
        renderAngle += normalizeAngleDelta(renderAngle, targetAngle) * 0.25;
        displayedAngle = renderAngle;
      }

      const digOffsetY = digDepth * 7;
      const digOffsetX = digDepth * 2;
      const dirtScale = 1 + digDepth * 0.35;

      renderX += (cursorX - renderX) * 0.28;
      renderY += (cursorY - renderY) * 0.28;

      if (shovelCursor) {
        shovelCursor.style.transform = `translate3d(${renderX - 27 + digOffsetX}px, ${renderY - 16 + digOffsetY}px, 0) rotate(${displayedAngle}deg)`;
      }
      if (shovelDirt) {
        shovelDirt.style.transform = `translate3d(${renderX - 20}px, ${renderY + 16 + digDepth * 1.5}px, 0) scale(${dirtScale})`;
      }
      if (shovelFling) {
        const flingT = digPhase === "dig" ? upstrokeProgress : 0;
        const flingActive = digPhase === "dig" && flingT > 0;
        if (flingActive) {
          const shovelAngle = (displayedAngle * Math.PI) / 180;
          const directionX = Math.cos(shovelAngle);
          const directionY = Math.sin(shovelAngle);
          const flingDistance = flingT * 28;
          const flingArc = Math.sin(flingT * Math.PI) * 16;
          const flingX = -Math.abs(directionX) * flingDistance - flingT * 4;
          const flingY = -Math.abs(directionY) * flingDistance - flingArc;
          const flingScale = 0.85 + (1 - flingT) * 0.35;
          shovelFling.style.opacity = `${1 - flingT * 0.85}`;
          shovelFling.style.transform = `translate3d(${renderX - 11 + flingX}px, ${renderY + 22 + flingY}px, 0) scale(${flingScale})`;
        } else {
          shovelFling.style.opacity = "0";
        }
      }

      rafId = window.requestAnimationFrame(renderCursor);
    };

    const handleMouseMove = (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;

      if (!cursorVisible) {
        renderX = cursorX;
        renderY = cursorY;
        updateCursorVisibility(true);
      }

      if (event.movementX || event.movementY) {
        targetAngle = (Math.atan2(event.movementY, event.movementX) * 180) / Math.PI;
      }

      const targetElement = event.target instanceof Element ? event.target : null;
      const isClickable = !!targetElement?.closest(clickableSelector);
      if (isClickable !== hoveringClickable) {
        hoveringClickable = isClickable;
        if (shovelDirt) {
          shovelDirt.style.opacity = cursorVisible && (hoveringClickable || digPhase !== "idle") ? "1" : "0";
        }
      }
    };

    const hideCursor = () => {
      digPhase = "idle";
      updateCursorVisibility(false);
    };
    const triggerDig = () => {
      if (!cursorVisible) return;
      const dirtCenterX = renderX - 20 + 9;
      const dirtCenterY = renderY + 16 + 6;
      const shovelTipX = renderX;
      const shovelTipY = renderY;
      aimFromAngle = renderAngle;
      aimToAngle = (Math.atan2(dirtCenterY - shovelTipY, dirtCenterX - shovelTipX) * 180) / Math.PI;
      digPhase = "aim";
      phaseStartAt = performance.now();
      if (shovelDirt) {
        shovelDirt.style.opacity = cursorVisible ? "1" : "0";
      }
    };
    const handleMouseDown = (event) => {
      const targetElement = event.target instanceof Element ? event.target : null;
      if (targetElement?.closest(clickableSelector)) return;
      triggerDig();
    };
    const handleClickCapture = (event) => {
      if (replayingClick || !cursorVisible) return;
      if (event.detail === 0) return;
      const targetElement = event.target instanceof Element ? event.target : null;
      const clickableTarget = targetElement?.closest(clickableSelector);
      if (!clickableTarget) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      triggerDig();

      window.clearTimeout(delayedClickTimeoutId);
      delayedClickTimeoutId = window.setTimeout(() => {
        if (!clickableTarget.isConnected) return;
        replayingClick = true;
        clickableTarget.click();
        replayingClick = false;
      }, DIG_TOTAL_DURATION_MS);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", hideCursor);
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("click", handleClickCapture, true);
    rafId = window.requestAnimationFrame(renderCursor);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("click", handleClickCapture, true);
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(delayedClickTimeoutId);
      document.body.classList.remove("use-custom-cursor");
    };
  });

  const handleContactSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const details = (data.get("details") || "").toString().trim();

    const subject = encodeURIComponent("Sub Vysion inquiry");
    const bodyLines = [
      name ? `Name: ${name}` : null,
      email ? `Email: ${email}` : null,
      details ? `Project details: ${details}` : null,
    ].filter(Boolean);

    const body = encodeURIComponent(bodyLines.join("\n"));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}${body ? `&body=${body}` : ""}`;
  };
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&family=Noto+Sans:wght@400;600;700&display=swap"
    rel="stylesheet"
  />
  <meta
    name="description"
    content="Sub Vysion lets crews upload their own GIS and CAD maps, align visually, and view accurate AR overlays on site or on the web."
  />
</svelte:head>

<div class="relative min-h-screen overflow-hidden font-sans bg-white">
  <div class="shovel-cursor" bind:this={shovelCursor} aria-hidden="true"></div>
  <div class="shovel-dirt" bind:this={shovelDirt} aria-hidden="true"></div>
  <div class="shovel-fling" bind:this={shovelFling} aria-hidden="true"></div>
  <header class="fixed inset-x-0 top-0 z-30 transition-all duration-300 {isScrolled ? 'py-3' : 'py-5'} backdrop-blur-xl {isScrolled ? 'bg-white/30 shadow-md border-b border-black/5' : 'border-b border-transparent'}">
      <div
        class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-black transition-all duration-300"
      >
        <a href="#" class="flex items-center">
          <img src="logo_full.svg" alt="SubVysion logo" class="h-10" />
        </a>
        <nav
          class="hidden items-center gap-7 text-base font-medium text-black/70 md:flex"
        >
          <a
            class="hover:text-black transition-all duration-300 hover:-translate-y-0.5"
            href="#workflow"
            on:click={smoothScroll}>Workflow</a
          >
          <a
            class="hover:text-black transition-all duration-300 hover:-translate-y-0.5"
            href="#trusted"
            on:click={smoothScroll}>Trusted</a
          >
          <a
            class="hover:text-black transition-all duration-300 hover:-translate-y-0.5"
            href="#platform"
            on:click={smoothScroll}>Platform</a
          >
          <a
            class="hover:text-black transition-all duration-300 hover:-translate-y-0.5"
            href="#pricing"
            on:click={smoothScroll}>Pricing</a
          >
          <a
            class="hover:text-black transition-all duration-300 hover:-translate-y-0.5"
            href="#contact"
            on:click={smoothScroll}>Contact</a
          >
        </nav>
        <a
          class="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          href="https://subvysion.setmore.com/services/71a943e6-77b0-4cdb-934f-de94600a9bb5"
          target="_blank"
          rel="noreferrer"
        >
          Book a demo
        </a>
      </div>
  </header>

  <main class="relative z-10 pt-24">
    <section class="relative overflow-hidden pt-24 pb-40 sm:pt-40 sm:pb-56 lg:pt-48 lg:pb-64 bg-white">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[url('/background.png')] bg-cover bg-center opacity-20"></div>
      <div class="absolute inset-0 -z-10 opacity-50" style="background-image: radial-gradient(circle, #14b8a6 1.5px, transparent 1.5px); background-size: 25px 25px;"></div>
      <div class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-white/95 to-white"></div>
      <div class="relative mx-auto max-w-6xl px-6">
        <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div class="max-w-3xl">
            <h1
              class="text-3xl font-display font-bold leading-tight text-black sm:text-4xl lg:text-5xl tracking-tight"
            >
              See what's below,
              <br class="hidden sm:block" />
              <span class="text-teal-600">before</span> you break it.
            </h1>
            <p class="mt-8 text-lg text-black/70 leading-relaxed sm:text-xl">
              Utility strikes cause $30B in damages annually. 1 in 3 are caused by
              locator error or inaccurate maps. We give you 100% visibility with
              complete mapping of underground utilities.
            </p>
            <div class="mt-10 flex flex-wrap gap-4">
              <a
                class="inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                href="https://subvysion.setmore.com/services/71a943e6-77b0-4cdb-934f-de94600a9bb5"
                target="_blank"
                rel="noreferrer"
              >
                Schedule a walkthrough
              </a>
              <a
                class="inline-flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:border-black/20 hover:shadow-md hover:-translate-y-0.5"
                href="#workflow"
                on:click={smoothScroll}
              >
                See how it works
              </a>
            </div>
          </div>
          <div class="lg:pl-12">
            <div class="rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
              <img
                src="/main_scene_flat.png"
                alt="SubVysion AR demo showing underground utilities visualization"
                class="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="relative overflow-hidden py-24 sm:py-32 bg-white" id="workflow">
      <div class="relative mx-auto max-w-6xl px-6">
        <div class="max-w-2xl">
          <p
            class="text-sm font-semibold uppercase tracking-widest text-black/50"
          >
            Workflow
          </p>
          <h2
            class="mt-3 text-4xl font-display font-bold text-black sm:text-5xl"
          >
            Complete Mapping for Hidden Infrastructure
          </h2>
          <p class="mt-5 text-lg text-black/70">
            Uses multi-sensor GPR and 3D-mapping techniques to create a
            complete picture of underground utilities with 99% accuracy.
          </p>
        </div>
        <div class="mt-16 grid gap-8 md:grid-cols-3">
          <div class="group card-hover flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <div
              class="overflow-hidden rounded-xl border border-slate-50 bg-slate-50">
              <img
                src="map.jpg"
                alt="GPR data collection"
                class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                style="aspect-ratio: 4 / 3;"
              />
            </div>
            <div class="mt-6 p-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white transition-all duration-300 group-hover:bg-teal-600">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path
                      d="M12 3a5 5 0 0 1 5 5c0 3.5-3.8 7.3-4.6 8.1a.6.6 0 0 1-.8 0C10.8 15.3 7 11.5 7 8a5 5 0 0 1 5-5Z"
                    />
                    <circle cx="12" cy="8" r="1.6" />
                    <path d="M8 20h8" stroke-linecap="round" />
                    <path d="M10 18h4" stroke-linecap="round" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-black">Collect</h3>
              </div>
              <p class="mt-4 text-black/70 text-base leading-relaxed">
                Process GPR data using multi-sensor techniques to create
                complete underground visibility.
              </p>
            </div>
          </div>
          <div class="group card-hover flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <div
              class="overflow-hidden rounded-xl border border-slate-50 bg-slate-50">
              <img
                src="view.png"
                alt="Data processing and overlay creation"
                class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                style="aspect-ratio: 4 / 3;"
              />
            </div>
            <div class="mt-6 p-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white transition-all duration-300 group-hover:bg-teal-600">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M4 6h16M4 12h16M4 18h10" stroke-linecap="round" />
                    <path
                      d="M17 15l3 3-3 3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-black">Process GPR data</h3>
              </div>
              <p class="mt-4 text-black/70 text-base leading-relaxed">
                We align GPR data with 3D surface data, perform quality control
                and validation, and build clean, accurate maps.
              </p>
            </div>
          </div>
          <div class="group card-hover flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <div
              class="overflow-hidden rounded-xl border border-slate-50 bg-slate-50">
              <img
                src="dig.png"
                alt="Viewing underground utilities in AR on phone"
                class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                style="aspect-ratio: 4 / 3;"
              />
            </div>
            <div class="mt-6 p-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white transition-all duration-300 group-hover:bg-teal-600">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <path d="M12 18h.01" stroke-linecap="round" />
                    <path d="M9 5h6" stroke-linecap="round" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-black">View intuitive AR visualizations</h3>
              </div>
              <p class="mt-4 text-black/70 text-base leading-relaxed">
                View maps in augmented reality to see exactly where
                infrastructure is, rather than relying on top-down, unaligned maps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

<section
      class="relative overflow-hidden py-24 sm:py-32 bg-white"
      id="trusted"
    >
      <div class="mx-auto max-w-6xl px-6">
        <div class="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div
            class="overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
            <img
              src="/teams.png"
              alt="Construction site with workers"
              class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-widest text-black/50"
            >
              Trusted by field teams
            </p>
            <h3
              class="mt-3 text-4xl font-display font-bold text-black sm:text-5xl"
            >
              Built with crews and contractors in mind
            </h3>
            <p class="mt-6 text-xl text-black/70 leading-relaxed">
              From utility locators to general contractors, SubVysion keeps
              every stakeholder aligned with clean, georeferenced data.
            </p>
            <div class="mt-10 flex flex-wrap gap-3">
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                General contractors
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                Utility locators
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                Pipeline builders
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                Fiber installers
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                Excavation crews
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-medium text-black transition-all duration-300 hover:border-black/20 hover:bg-black hover:text-white hover:shadow-md">
                Civil engineers
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

<section
      class="relative overflow-hidden py-24 sm:py-32 bg-white"
      id="platform"
    >
      <div class="mx-auto max-w-6xl px-6">
        <div class="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-widest text-black/50"
            >
              Integrations
            </p>
            <h2
              class="mt-3 text-4xl font-display font-bold text-black sm:text-5xl"
            >
              Bring SubVysion into your mapping stack
            </h2>
            <p class="mt-5 text-lg text-black/70">
              Sync overlays with the GIS and CAD tools your teams already use,
              so AR stays in step with design and field updates.
            </p>
          </div>
          <div
            class="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.5 3 2.5 15 0 18" />
                    <path d="M12 3c-2.5 3-2.5 15 0 18" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-black truncate">ArcGIS</p>
                  <p class="text-xs text-black/50 truncate">Esri</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M12 4 5 19h14L12 4Z" />
                    <path d="M12 9.5 15 16H9l3-6.5Z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-base font-bold text-black truncate">AutoCAD</p>
                  <p class="text-xs text-black/50 truncate">Autodesk</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M12 3 6 7v10l6 4 6-4V7l-6-4Z" />
                    <path d="M6 7 12 11 18 7" />
                    <path d="M12 11v10" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-base font-bold text-black truncate">Revit</p>
                  <p class="text-xs text-black/50 truncate">Autodesk</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path
                      d="M7 20c1.5-3 3.5-5 8-5 1.6 0 3.1.3 4.5.9"
                      stroke-linecap="round"
                    />
                    <path d="M6 4h12" />
                    <path d="M8 4 6 12h4l2-5" stroke-linecap="round" />
                    <path d="M16 4 18 12h-4l-2-5" stroke-linecap="round" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-base font-bold text-black truncate">Bentley</p>
                  <p class="text-xs text-black/50 truncate">OpenRoads</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <circle cx="12" cy="12" r="7" />
                    <path d="M12 5v14M5 12h14" />
                    <path d="M9 9h6v6H9z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-base font-bold text-black truncate">Trimble</p>
                  <p class="text-xs text-black/50 truncate">TBC</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M5 5h14v10H5z" />
                    <path d="M9 15v4l3-2 3 2v-4" />
                    <circle cx="9" cy="9" r="1.2" />
                    <circle cx="15" cy="9" r="1.2" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-base font-bold text-black truncate">QGIS</p>
                  <p class="text-xs text-black/50 truncate">Desktop</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M7 8 4 12l3 4" stroke-linecap="round" />
                    <path d="M17 8 20 12l-3 4" stroke-linecap="round" />
                    <path d="M10 6h4v12h-4z" />
                  </svg>
                </div>
                <div>
                  <p class="text-base font-bold text-black">GeoJSON</p>
                  <p class="text-xs text-black/50">Import</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M6 9h12l-6-4-6 4Z" />
                    <path d="M6 15h12l-6 4-6-4Z" />
                    <path d="M6 9v6l6 4 6-4V9l-6 4-6-4Z" />
                  </svg>
                </div>
                <div>
                  <p class="text-base font-bold text-black">KML</p>
                  <p class="text-xs text-black/50">Import</p>
                </div>
              </div>
              <div
                class="card-hover flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-md">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-all duration-300 shrink-0">
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5">
                    <path d="M8 3h6l4 4v14H8z" />
                    <path d="M14 3v4h4" />
                    <path d="M10 12h4" />
                    <path d="M10 16h4" />
                  </svg>
                </div>
                <div>
                  <p class="text-base font-bold text-black">Shapefile</p>
                  <p class="text-xs text-black/50">Export</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="relative overflow-hidden py-24 sm:py-32 bg-white"
      id="pricing"
    >
      <div class="mx-auto max-w-6xl px-6">
        <div class="max-w-2xl">
          <p
            class="text-sm font-semibold uppercase tracking-widest text-black/50"
          >
            Pricing
          </p>
<h2
            class="mt-3 text-4xl font-display font-bold text-black sm:text-5xl"
          >
            Complete Mapping for Hidden Infrastructure
          </h2>
          <p class="mt-5 text-lg text-black/70">
            Uses multi-sensor GPR and 3D-mapping techniques to create a
            complete picture of underground utilities with 99% accuracy.
          </p>
        </div>
        <div class="mt-16 grid gap-6 md:grid-cols-2">
          <div
            class="card-hover flex h-full flex-col rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-md transition-all duration-300 hover:border-black/10 hover:shadow-xl"
          >
            <h3 class="text-2xl font-bold text-black">Team</h3>
            <p class="mt-2 text-base text-black/70">
              For pilot crews and focused deployments.
            </p>
            <ul class="mt-8 space-y-4 text-base text-black/80 flex-1">
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Uploads & cloud sync</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Platform access</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>AR App</span>
              </li>
            </ul>
            <a
              class="btn-hover mt-8 inline-flex items-center justify-center rounded-full border-2 border-black px-6 py-4 text-base font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white hover:shadow-xl"
              href="https://subvysion.setmore.com/services/71a943e6-77b0-4cdb-934f-de94600a9bb5"
              target="_blank"
              rel="noreferrer"
            >
              Get started
            </a>
          </div>
          <div
            class="card-hover flex h-full flex-col rounded-3xl border-2 border-teal-600 bg-white p-8 shadow-lg transition-all duration-300 hover:border-teal-700 hover:shadow-2xl"
          >
            <h3 class="text-2xl font-bold text-black">Enterprise</h3>
            <p class="mt-2 text-base text-black/70">
              For full-field rollouts and advanced controls.
            </p>
            <ul class="mt-8 space-y-4 text-base text-black/80 flex-1">
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Complete mapping with 99% accuracy</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>AR visualization of underground infrastructure</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>SSO</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Custom software integrations</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-6 w-6 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Data export</span>
              </li>
            </ul>
            <a
              class="btn-hover mt-8 inline-flex items-center justify-center rounded-full bg-black px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-teal-600 hover:shadow-2xl hover:-translate-y-1"
              href="https://subvysion.setmore.com/services/71a943e6-77b0-4cdb-934f-de94600a9bb5"
              target="_blank"
              rel="noreferrer"
            >
              Book a demo
            </a>
          </div>
        </div>
      </div>
    </section>

    <section
      class="relative overflow-hidden py-24 sm:py-32 bg-white"
      id="contact"
    >
      <div class="mx-auto max-w-6xl px-6">
        <div
          class="rounded-3xl bg-black p-10 md:p-14 shadow-2xl"
        >
          <div class="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 class="text-4xl font-display font-bold text-white sm:text-5xl">
                Bring AR overlays to your next dig window
              </h2>
              <p class="mt-6 text-xl text-white/80">
                Tell us about your sites, utilities, and timelines. We'll tailor
                a demo to your crew and handoff requirements.
              </p>
              <div class="mt-10 space-y-4">
                <a
                  class="btn-hover flex items-center gap-3 text-base text-white/90 transition-all duration-300 hover:text-white hover:-translate-x-1"
                  href="mailto:maxwell@subvysion.com"
                >
                  <svg class="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  maxwell@subvysion.com
                </a>
                <a
                  class="btn-hover flex items-center gap-3 text-base text-white/90 transition-all duration-300 hover:text-white hover:-translate-x-1"
                  href="mailto:wenson@subvysion.com"
                >
                  <svg class="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  wenson@subvysion.com
                </a>
                <a
                  class="btn-hover flex items-center gap-3 text-base text-white/90 transition-all duration-300 hover:text-white hover:-translate-x-1"
                  href="tel:+12158747115"
                >
                  <svg class="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  (215) 874-7115
                </a>
              </div>
            </div>
            <form class="space-y-5" on:submit={handleContactSubmit}>
              <div>
                <label class="block text-sm font-medium text-white/90 mb-2" for="name">Name</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Your name"
                  class="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 focus:border-teal-500 focus:bg-white/20 focus:shadow-lg focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/90 mb-2" for="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  class="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 focus:border-teal-500 focus:bg-white/20 focus:shadow-lg focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/90 mb-2" for="details">Project details</label>
                <textarea
                  id="details"
                  name="details"
                  rows="3"
                  placeholder="Utility type, timelines, sites..."
                  class="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 focus:border-teal-500 focus:bg-white/20 focus:shadow-lg focus:ring-2 focus:ring-teal-500/50"
                ></textarea>
              </div>
              <button
                type="submit"
                class="btn-hover w-full inline-flex items-center justify-center rounded-full bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-teal-500 hover:shadow-2xl hover:-translate-y-0.5"
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>
