<script>
  import { onMount } from 'svelte';
  import StandingWaveBackground from './StandingWaveBackground.svelte';

  let activeSection = 'hero';

  // Sections are self-contained: each owns its own background. No global
  // scroll-progress gradient or bg-stage cutout is tracked here.
  const sectionIds = ['hero', 'workflow', 'trusted', 'pricing', 'contact'];

  // name/email/details for contact form
  let name = '';
  let email = '';
  let details = '';

  // Streetmock spotlight reveal — position is in CSS px relative to the frame.
  let streetmockHover = false;
  let streetmockX = 0;
  let streetmockY = 0;

  function streetmockMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    streetmockX = e.clientX - rect.left;
    streetmockY = e.clientY - rect.top;
  }

  function smoothScroll(e, href) {
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const t = document.querySelector(href);
      if (t) {
        const y = t.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }

  function handleScroll() {
    // Determine the current "active" section for nav highlighting.
    let active = sectionIds[0];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.35) active = id;
    }
    activeSection = active;
  }

  function submitContact(e) {
    e.preventDefault();
    const subject = encodeURIComponent('Sub Vysion inquiry');
    const body = encodeURIComponent(
      [
        name.trim() && `Name: ${name.trim()}`,
        email.trim() && `Email: ${email.trim()}`,
        details.trim() && `Project details: ${details.trim()}`
      ]
        .filter(Boolean)
        .join('\n')
    );
    window.location.href = `mailto:maxwell@subvysion.com?subject=${subject}${body ? `&body=${body}` : ''}`;
  }

  onMount(() => {
    // Reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) en.target.classList.add('in');
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // Reset the .reveal-video to the start of the clip whenever Section 3
    // (#trusted) enters the viewport. The wasVisible flag prevents the
    // reset from firing on the trailing edge or on every threshold cross
    // during a single continuous visibility — only on a true off→on flip.
    let trustedWasVisible = false;
    const trustedEl = document.getElementById('trusted');
    const revealVideo = document.querySelector('.reveal-video');
    let videoIo = null;
    if (trustedEl && revealVideo) {
      videoIo = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            const isVisible = en.isIntersecting;
            if (isVisible && !trustedWasVisible) {
              try {
                revealVideo.currentTime = 0;
                const p = revealVideo.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch (e) {}
            }
            trustedWasVisible = isVisible;
          }
        },
        { threshold: 0.1 }
      );
      videoIo.observe(trustedEl);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      io.disconnect();
      if (videoIo) videoIo.disconnect();
    };
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
    rel="stylesheet"
  />
  <title>SubVysion — Mapping Intelligence for Hidden Infrastructure</title>
</svelte:head>

<!-- Fixed full-viewport video that sits behind everything. Revealed only
     where a section's .section-bg is transparent (currently #trusted). -->
<video class="reveal-video" autoplay muted loop playsinline preload="auto" src="/TopDownPio2.mp4" aria-hidden="true"></video>

<!-- NAV -->
<header class="nav">
  <div class="container nav-inner">
    <a href="#hero" class="brand" on:click={(e) => smoothScroll(e, '#hero')} aria-label="SubVysion">
      <img src="/SubVysionLogoFullWhite.png" alt="SubVysion" class="brand-logo" />
    </a>

    <nav class="nav-links">
      <a href="#workflow" on:click={(e) => smoothScroll(e, '#workflow')} class:active={activeSection === 'workflow'}>Workflow</a>
      <a href="#trusted"  on:click={(e) => smoothScroll(e, '#trusted')}  class:active={activeSection === 'trusted'}>Teams</a>
      <a href="#pricing"  on:click={(e) => smoothScroll(e, '#pricing')}  class:active={activeSection === 'pricing'}>Pricing</a>
      <a href="#contact"  on:click={(e) => smoothScroll(e, '#contact')}  class:active={activeSection === 'contact'}>Contact</a>
    </nav>

    <div class="nav-right">
      <a
        class="btn btn-primary btn-sm btn-nav"
        href="https://calendar.app.google/fTedeqFWQAswPzKa9"
        target="_blank"
        rel="noreferrer"
      >
        Book a demo
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
    </div>
  </div>
</header>

<main>
  <!-- HERO — before/after streetmock as a lowkey full-bleed background.
       Mouse listeners live on the <section> itself because .section-bg has
       pointer-events:none; the cursor position is published as --mx / --my
       inline CSS vars that cascade down to the mask on .streetmock-after.
       The handlers drive a purely decorative visual effect (no click or
       keyboard interaction), so the section keeps its implicit landmark
       role and we silence the static-interactive-element lint. -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <section
    id="hero"
    class="hero"
    class:is-hovering={streetmockHover}
    style="--mx:{streetmockX}px; --my:{streetmockY}px"
    on:mousemove={streetmockMove}
    on:mouseenter={() => (streetmockHover = true)}
    on:mouseleave={() => (streetmockHover = false)}
  >
    <div class="section-bg" aria-hidden="true">
      <div class="streetmock-bg">
        <img
          src="/streetmockupbefore.png"
          alt=""
          class="streetmock-img streetmock-before"
          draggable="false"
        />
        <img
          src="/streetmockupafter.png"
          alt=""
          class="streetmock-img streetmock-after"
          draggable="false"
        />
      </div>
    </div>

    <div class="hero-body">
      <div class="hero-intro">
        <!-- Logo: fades in at t=0 over 1000ms. -->
        <img src="/SubVysionLogoFullWhite.png" alt="SubVysion" class="hero-intro-logo" />
        <!-- Subheading: single descriptive line that fades in at t=1500ms
             after the logo settles. The phrase is long enough to wrap on
             smaller viewports — handled in CSS via max-width + balanced
             wrapping rather than nowrap. -->
        <h1 class="hero-intro-title">
          <span class="hero-intro-title-part hero-intro-title-a">AI-powered Underground Intelligence</span>
        </h1>
      </div>
    </div>
  </section>

  <!-- Transition 1 → 2: var(--bg) fog band centered on the seam,
       dissolving the streetmock photo above into the page bg and
       the wave canvas below into the same. -->
  <div class="section-transition transition-1-2" aria-hidden="true">
    <div class="transition-fx"></div>
  </div>

  <!-- WORKFLOW -->
  <section id="workflow" class="section">
    <!-- Standing-wave field: drifting Gaussian peaks with sin(k·r)·sin(ω·t)
         contour rendering — reads as topographic isolines flowing around
         the heading "Complete mapping for hidden infrastructure." -->
    <div class="section-bg" aria-hidden="true">
      <StandingWaveBackground theme="dark" />
    </div>
    <div class="container">
      <div class="grid-12">
        <div class="col-5 reveal">
          <h2 class="h2">Augmented-reality maps for<br />hidden infrastructure.</h2>
          <p class="lead-copy" style="margin-top:24px;">
            See what's below, before you break it.
          </p>
        </div>
        <div class="col-7">
          <!-- What we handle: GPR collection + processing. Listed compactly. -->
          <div class="workflow-group reveal">
            <div class="workflow-group-label">What we handle</div>
            <ol class="steps">
              <li class="step step-1">
                <div class="step-n" aria-hidden="true">
                  <!-- GPR sensor scanning ground: target above, ground line,
                       curved waves penetrating, detected asset below. -->
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
                    <path d="M12 5.5 V8" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M6 12 a6 6 0 0 1 12 0" />
                    <path d="M9 12 a3 3 0 0 1 6 0" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <div class="step-title">Complete Mapping</div>
                  <p class="step-body">
                    Multi-sensor GPR and 3D-mapping techniques build a complete picture of
                    underground utilities with 99% accuracy.
                  </p>
                </div>
              </li>
              <li class="step step-2">
                <div class="step-n" aria-hidden="true">
                  <!-- Stacked layers: GPR + 3D surface data aligned into a
                       single map. Three diamond layers stacked. -->
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 3 22 8 12 13 2 8 12 3" />
                    <polyline points="2 13 12 18 22 13" />
                    <polyline points="2 18 12 23 22 18" />
                  </svg>
                </div>
                <div>
                  <div class="step-title">Process GPR data</div>
                  <p class="step-body">
                    We align GPR data with 3D surface data, run quality control and validation, and
                    build clean, accurate maps.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <!-- What you get: the AR app. Same compact list treatment as the
               group above so the two parts read as parallel, not one over
               the other. -->
          <div class="workflow-group workflow-group-featured reveal">
            <div class="workflow-group-label">What you get</div>
            <ol class="steps">
              <li class="step step-3">
                <div class="step-n" aria-hidden="true">
                  <!-- Smartphone displaying an AR map pin — the AR view of
                       underground assets in real-world space. -->
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2.5" ry="2.5" />
                    <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
                    <path d="M12 7 c-1.9 0-3.4 1.5-3.4 3.4 c0 2.6 3.4 5.1 3.4 5.1 s3.4-2.5 3.4-5.1 c0-1.9-1.5-3.4-3.4-3.4 z" />
                    <circle cx="12" cy="10.4" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <div class="step-title">View intuitive AR</div>
                  <p class="step-body">
                    Point your phone — every underground utility appears exactly where it is, in
                    real-world space. A simple, easy-to-use app that turns hidden infrastructure
                    into something you can just see.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <p class="workflow-tagline reveal">
        We give you 100% visibility… a <strong>single-source ground truth</strong>.
      </p>
    </div>
  </section>

  <!-- Transition 2 → 3: var(--bg) fog band at the seam, fading the
       wave canvas above out and easing the fixed-video reveal in. -->
  <div class="section-transition transition-2-3" aria-hidden="true">
    <div class="transition-fx"></div>
  </div>

  <!-- TRUSTED — Its .section-bg is transparent, so the fixed
       .reveal-video shows through this section only. Other sections have
       opaque .section-bg fills that cover the same video. -->
  <section id="trusted" class="section">
    <div class="section-bg" aria-hidden="true"></div>
    <div class="container">
      <div class="trusted-content reveal">
        <h2 class="h2">Built for crews and contractors.</h2>
        <p class="lead-copy">
          Made for the people who take on the most risk — SubVysion keeps every stakeholder aligned
          with clean, georeferenced data.
        </p>
        <div class="chip-row">
          <span class="chip"><span class="chip-dot"></span>Utility Contractors</span>
          <span class="chip"><span class="chip-dot"></span>General/Site Contractors</span>
          <span class="chip"><span class="chip-dot"></span>Utility Locators</span>
          <span class="chip"><span class="chip-dot"></span>Civil Engineers</span>
          <span class="chip"><span class="chip-dot"></span>Design Firms</span>
          <span class="chip"><span class="chip-dot"></span>Utility Companies</span>
          <span class="chip"><span class="chip-dot"></span>Insurance Companies</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Transition 3 → 4: var(--bg) fog band at the seam, easing the
       fixed-video reveal out into pricing's solid bg. -->
  <div class="section-transition transition-3-4" aria-hidden="true">
    <div class="transition-fx"></div>
  </div>

  <!-- PRICING -->
  <section id="pricing" class="section">
    <!-- Per-section background slot (to be curated later). -->
    <div class="section-bg" aria-hidden="true"></div>
    <div class="container">
      <!-- Trust bar: right-to-left marquee of 7 logo placeholders.
           Sized to the middle ~25vw of the screen with soft mask-gradient
           fade on both edges. The set is duplicated in the DOM so the
           translateX animation can loop seamlessly. -->
      <div class="trust-bar reveal">
        <div class="trust-bar-label">Trusted and Supported by:</div>
        <div class="trust-bar-window">
          <div class="trust-bar-track">
            <div class="trust-logo"><img src="/logos/Pio_logo.png" alt="Pio" /></div>
            <div class="trust-logo"><img src="/logos/SweetSpotLogo.webp" alt="SweetSpot" /></div>
            <div class="trust-logo"><img src="/logos/VentureLabLogo.png" alt="VentureLab" /></div>
            <div class="trust-logo trust-logo--text"><span>Gessler<br />Construction</span></div>
            <!-- Duplicate set so the marquee can loop without a visible jump. -->
            <div class="trust-logo" aria-hidden="true"><img src="/logos/Pio_logo.png" alt="" /></div>
            <div class="trust-logo" aria-hidden="true"><img src="/logos/SweetSpotLogo.webp" alt="" /></div>
            <div class="trust-logo" aria-hidden="true"><img src="/logos/VentureLabLogo.png" alt="" /></div>
            <div class="trust-logo trust-logo--text" aria-hidden="true"><span>Gessler<br />Construction</span></div>
          </div>
        </div>
      </div>

      <div class="pricing-tiles-cta reveal">Bring SubVysion to your next dig</div>

      <div class="pricing-grid">
        <div class="panel reveal">
          <div class="plan-name">Team</div>
          <p class="plan-desc">For pilot programs and sparse deployments.</p>
          <ul class="plan-features">
            <li><span class="arrow">→</span>Uploads &amp; cloud sync</li>
            <li><span class="arrow">→</span>Platform access</li>
            <li><span class="arrow">→</span>AR App</li>
          </ul>
          <a
            class="btn btn-ghost plan-cta"
            href="https://calendar.app.google/fTedeqFWQAswPzKa9"
            target="_blank"
            rel="noreferrer"
          >
            Get started
          </a>
        </div>
        <div class="panel reveal">
          <div class="plan-name">Enterprise Scale</div>
          <p class="plan-desc">For large projects, and consistent mapping needs.</p>
          <ul class="plan-features">
            <li><span class="arrow">→</span>Uploads &amp; cloud sync</li>
            <li><span class="arrow">→</span>Platform access</li>
            <li><span class="arrow">→</span>AR App</li>
            <li><span class="arrow">→</span>At-scale pricing</li>
          </ul>
          <a
            class="btn btn-primary plan-cta"
            href="https://calendar.app.google/fTedeqFWQAswPzKa9"
            target="_blank"
            rel="noreferrer"
          >
            Book a demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Transition 4 → 5: var(--bg) fog band at the seam — both sides
       already share the same bg, so this reads as a soft section
       break with the red marker line still indicating the boundary. -->
  <div class="section-transition transition-4-5" aria-hidden="true">
    <div class="transition-fx"></div>
  </div>

  <!-- CONTACT -->
  <section id="contact" class="section">
    <!-- Per-section background slot (to be curated later). -->
    <div class="section-bg" aria-hidden="true"></div>
    <div class="container">
      <div class="contact-grid reveal">
        <div class="contact-left">
          <div class="section-label">05 — Contact</div>
          <h2 class="h2">Bring AR overlays to<br />your next dig window.</h2>
          <p class="lead-copy">
            Tell us about your sites, utilities, and timelines. We'll tailor a demo to your crew and
            handoff requirements.
          </p>
          <div class="contact-list">
            <a href="mailto:maxwell@subvysion.com"><span class="contact-label">EMAIL</span>maxwell@subvysion.com</a>
            <a href="mailto:wenson@subvysion.com"><span class="contact-label">EMAIL</span>wenson@subvysion.com</a>
            <a href="tel:+12158747115"><span class="contact-label">PHONE</span>(215) 874-7115</a>
          </div>
        </div>
        <form class="contact-right form-panel" on:submit={submitContact}>
          <div class="form-row">
            <label class="form-label">
              <span>Name</span>
              <input class="form-input" name="name" type="text" placeholder="Your name" bind:value={name} />
            </label>
            <label class="form-label">
              <span>Email</span>
              <input class="form-input" name="email" type="email" placeholder="name@company.com" bind:value={email} />
            </label>
          </div>
          <label class="form-label">
            <span>Project details</span>
            <textarea class="form-text" name="details" rows="4" placeholder="Utility type, timelines, sites..." bind:value={details}></textarea>
          </label>
          <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">
            Send message
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </form>
      </div>

      <div class="footer">
        <div>© 2026 SubVysion · Mapping Intelligence</div>
        <div>v2.0 · Radar build</div>
      </div>
    </div>
  </section>
</main>
