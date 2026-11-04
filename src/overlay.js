import gsap from 'gsap';
import { CONFIG, CHAPTER_COPY } from './content.js';
import {
  setPaintColor,
  setPaintFinish,
  setWheelFinish,
  setCaliperColor,
  setInteriorOption,
  setXRayAmount,
  loadSavedCustomizerState,
  getCustomizerState
} from './materials.js';
import { audioManager } from './audio.js';

/**
 * Cinematic HTML/SVG Overlay & Showroom Interaction Manager
 * (PRD Phases 3, 4, 5, 7 + Upgrades)
 *
 * Features:
 * 1. Animated SVG Leader Lines with glow and dynamic anchor tracking
 * 2. Surface Finish & Extended Customizer Selectors (Paint, Finish, Wheels, Calipers, Interior)
 * 3. Interactive X-Ray / Holographic Chassis Slider + Reset Exploded View
 * 4. 360° Drag to Explore Visual Indicator
 * 5. Floating Luxury Configurator Bottom Dock + Share Configuration URL
 * 6. Technical Specifications Modal Dialog (Open / Close / ESC / Backdrop)
 */

export class OverlayController {
  constructor(explodeController) {
    this.explode = explodeController;

    // Elements
    this.letterboxTop = document.getElementById('letterbox-top');
    this.letterboxBottom = document.getElementById('letterbox-bottom');
    this.heroSection = document.getElementById('hero-section');
    this.exteriorStats = document.getElementById('exterior-stats');
    this.calloutCard = document.getElementById('callout-card');
    this.leaderLineSvg = document.getElementById('leader-line-svg');
    this.leaderPath = document.getElementById('leader-path');
    this.leaderDot = document.getElementById('leader-dot');
    this.detailsSection = document.getElementById('details-section');
    this.ctaSection = document.getElementById('cta-section');
    this.chapterDots = document.querySelectorAll('.chapter-dot');
    this.dragHint = document.getElementById('drag-hint');
    this.xraySliderWrap = document.getElementById('xray-slider-wrap');
    this.xraySlider = document.getElementById('xray-slider');
    this.btnResetExplode = document.getElementById('btn-reset-explode');
    this.btnShareConfig = document.getElementById('btn-share-config');
    this.shareToast = document.getElementById('share-toast');

    // Film Reel HUD & Cinematic Elements
    this.filmReelHud = document.getElementById('film-reel-hud');
    this.reelCurrentNum = document.getElementById('reel-current-num');
    this.reelCurrentTitle = document.getElementById('reel-current-title');
    this.reelCurrentMove = document.getElementById('reel-current-move');
    this.revealLine = document.getElementById('reveal-line');
    this.orbitAnnotations = document.getElementById('orbit-annotations');
    this.orbitCard = document.getElementById('orbit-card');
    this.orbitBearing = document.getElementById('orbit-bearing');
    this.orbitTitle = document.getElementById('orbit-title');
    this.dollyZoomScreen = document.getElementById('dolly-zoom-screen');
    this.depthRuler = document.getElementById('depth-ruler');
    this.depthRulerThumb = document.getElementById('depth-ruler-thumb');
    this.rulerNotches = document.querySelectorAll('.ruler-notch');
    this.directorsNoteCard = document.getElementById('directors-note-card');
    this.directorsQuote = document.getElementById('directors-quote');
    this.finaleCtaHero = document.getElementById('finale-cta-hero');
    this.btnReserveViewing = document.getElementById('btn-reserve-viewing');

    // Specifications Modal Elements
    this.specsModal = document.getElementById('specs-modal');
    this.specsModalBackdrop = document.getElementById('specs-modal-backdrop');
    this.btnOpenSpecs = document.getElementById('btn-open-specs');
    this.btnCloseSpecs = document.getElementById('btn-close-specs');

    this.activeCalloutKey = null;

    this.setupColorSwitcher();
    this.setupFinishSwitcher();
    this.setupWheelSwitcher();
    this.setupCaliperSwitcher();
    this.setupInteriorSwitcher();
    this.setupShareButton();
    this.setupResetExplodeButton();
    this.setupXRayControl();
    this.setupSpecsModal();
    this.setupViewingReservation();

    this.restoreCustomizerState();
  }

  setupViewingReservation() {
    if (this.btnReserveViewing) {
      this.btnReserveViewing.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playClick();
        this.showShareToast('Private viewing reservation requested. Our concierge will contact you.');
      });
    }
  }

  setupColorSwitcher() {
    const swatches = document.querySelectorAll('.paint-swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        swatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const colorKey = swatch.dataset.color;
        setPaintColor(colorKey);
        audioManager.playClick();

        // 06 THE FINALE: ~2% push-and-settle "breath" plus a light band sweeping across the body
        if (window.__timeline && window.__timeline.carContainer) {
          gsap.fromTo(
            window.__timeline.carContainer.scale,
            { x: 1.0, y: 1.0, z: 1.0 },
            { x: 1.025, y: 1.025, z: 1.025, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }
          );
        }

        if (window.__timeline && window.__timeline.lights && window.__timeline.lights.stripLight) {
          const strip = window.__timeline.lights.stripLight;
          strip.intensity = 24.0;
          strip.position.x = -6.0;
          gsap.to(strip.position, {
            x: 6.0,
            duration: 0.8,
            ease: 'power2.inOut',
            onUpdate: () => {
              strip.target.position.x = strip.position.x * 0.85;
            },
            onComplete: () => {
              strip.intensity = 0.0;
            }
          });
        }

        const preset = CONFIG.PAINT_PRESETS[colorKey];
        if (preset && window.__scene && window.__scene.setBackgroundTint) {
          window.__scene.setBackgroundTint(preset.hex);
        }
      });
    });
  }

  setupFinishSwitcher() {
    const finishPills = document.querySelectorAll('.finish-pill');
    finishPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        finishPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const finish = pill.dataset.finish;
        setPaintFinish(finish);
        audioManager.playClick();
      });
    });
  }

  setupWheelSwitcher() {
    const wheelSwatches = document.querySelectorAll('.wheel-swatch');
    wheelSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        wheelSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const wheelKey = swatch.dataset.wheels;
        setWheelFinish(wheelKey);
        audioManager.playClick();
      });
    });
  }

  setupCaliperSwitcher() {
    const caliperSwatches = document.querySelectorAll('.caliper-swatch');
    caliperSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        caliperSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const caliperKey = swatch.dataset.calipers;
        setCaliperColor(caliperKey);
        audioManager.playClick();
      });
    });
  }

  setupInteriorSwitcher() {
    const interiorPills = document.querySelectorAll('.interior-pill');
    interiorPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        interiorPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const interiorKey = pill.dataset.interior;
        setInteriorOption(interiorKey);
        audioManager.playClick();
      });
    });
  }

  setupShareButton() {
    if (!this.btnShareConfig) return;

    this.btnShareConfig.addEventListener('click', () => {
      audioManager.playClick();
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          this.showShareToast('Configuration URL copied to clipboard!');
        }).catch(() => {
          this.showShareToast('URL updated in address bar!');
        });
      } else {
        this.showShareToast('URL updated in address bar!');
      }
    });
  }

  showShareToast(msg) {
    if (!this.shareToast) return;
    this.shareToast.innerText = msg;
    this.shareToast.classList.add('show');
    setTimeout(() => {
      this.shareToast.classList.remove('show');
    }, 3000);
  }

  setupResetExplodeButton() {
    if (!this.btnResetExplode) return;

    this.btnResetExplode.addEventListener('click', () => {
      audioManager.playWhoosh(0.3);
      if (this.xraySlider) {
        this.xraySlider.value = 0;
        setXRayAmount(0);
      }
      // Snap parts to rest
      if (this.explode) {
        this.explode.update(0);
      }
      // Scrub scroll slightly backwards to chapter 4 or reassemble
      if (window.__timeline) {
        window.__timeline.scrollToChapter(3); // Chapter 4: Reassembly
      }
    });
  }

  setupXRayControl() {
    if (!this.xraySlider) return;

    this.xraySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      setXRayAmount(val / 100);
    });
  }

  setupSpecsModal() {
    if (!this.specsModal) return;

    const openModal = (e) => {
      if (e) e.preventDefault();
      audioManager.playClick();
      this.specsModal.style.display = 'flex';
      void this.specsModal.offsetWidth; // Force reflow
      this.specsModal.classList.add('open');
    };

    const closeModal = () => {
      audioManager.playClick();
      this.specsModal.classList.remove('open');
      setTimeout(() => {
        if (!this.specsModal.classList.contains('open')) {
          this.specsModal.style.display = 'none';
        }
      }, 350);
    };

    if (this.btnOpenSpecs) {
      this.btnOpenSpecs.addEventListener('click', openModal);
    }
    if (this.btnCloseSpecs) {
      this.btnCloseSpecs.addEventListener('click', closeModal);
    }
    if (this.specsModalBackdrop) {
      this.specsModalBackdrop.addEventListener('click', closeModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.specsModal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  restoreCustomizerState() {
    const state = loadSavedCustomizerState();
    if (!state) return;

    // 1. Paint
    if (state.paint) {
      const swatch = document.querySelector(`.paint-swatch[data-color="${state.paint}"]`);
      if (swatch) {
        document.querySelectorAll('.paint-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        setPaintColor(state.paint);
      }
    }

    // 2. Finish
    if (state.finish) {
      const pill = document.querySelector(`.finish-pill[data-finish="${state.finish}"]`);
      if (pill) {
        document.querySelectorAll('.finish-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        setPaintFinish(state.finish);
      }
    }

    // 3. Wheels
    if (state.wheels) {
      const wheelSwatch = document.querySelector(`.wheel-swatch[data-wheels="${state.wheels}"]`);
      if (wheelSwatch) {
        document.querySelectorAll('.wheel-swatch').forEach(w => w.classList.remove('active'));
        wheelSwatch.classList.add('active');
        setWheelFinish(state.wheels);
      }
    }

    // 4. Calipers
    if (state.calipers) {
      const calSwatch = document.querySelector(`.caliper-swatch[data-calipers="${state.calipers}"]`);
      if (calSwatch) {
        document.querySelectorAll('.caliper-swatch').forEach(c => c.classList.remove('active'));
        calSwatch.classList.add('active');
        setCaliperColor(state.calipers);
      }
    }

    // 5. Interior
    if (state.interior) {
      const intPill = document.querySelector(`.interior-pill[data-interior="${state.interior}"]`);
      if (intPill) {
        document.querySelectorAll('.interior-pill').forEach(i => i.classList.remove('active'));
        intPill.classList.add('active');
        setInteriorOption(state.interior);
      }
    }
  }

  /**
   * Main per-frame update driven by master progress [0, 1]
   */
  update(p, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width <= 768;

    // 0. Update Chapter Dots & Cinematic Film Reel HUD
    this.updateChapterDots(p);
    this.updateFilmReelHud(p);

    // CHAPTER 01: THE REVEAL (0.00 - 0.12) — "Not built to be seen. Built to be felt."
    if (p <= 0.12) {
      const heroT = p / 0.12;
      const barHeight = Math.max(0, (1 - heroT) * 9.5);
      if (this.letterboxTop) this.letterboxTop.style.height = `${barHeight}vh`;
      if (this.letterboxBottom) this.letterboxBottom.style.height = `${barHeight}vh`;

      const heroOpacity = Math.max(0, 1 - (p / 0.10));
      if (this.heroSection) {
        this.heroSection.style.opacity = heroOpacity;
        this.heroSection.style.transform = `translateY(${p * -100}px)`;
        this.heroSection.style.pointerEvents = heroOpacity > 0.1 ? 'auto' : 'none';
      }

      // Synchronize letter reveal mask to light sweep progress
      if (this.revealLine) {
        const maskPercent = Math.min(100, Math.max(0, ((heroT - 0.12) / 0.72) * 100));
        const gradient = `linear-gradient(90deg, #ffffff ${maskPercent}%, rgba(255,255,255,0.08) ${maskPercent + 14}%)`;
        this.revealLine.style.maskImage = gradient;
        this.revealLine.style.webkitMaskImage = gradient;
      }
    } else {
      if (this.letterboxTop) this.letterboxTop.style.height = '0vh';
      if (this.letterboxBottom) this.letterboxBottom.style.height = '0vh';
      if (this.heroSection) {
        this.heroSection.style.opacity = '0';
        this.heroSection.style.pointerEvents = 'none';
      }
    }

    // CHAPTER 02: THE ORBIT (0.12 - 0.30) — "Walk the room"
    // Four annotations: Rear ("The fins."), Side ("The single line."), Front ("The grille."), Top ("The spine.")
    if (p > 0.12 && p <= 0.30) {
      if (this.exteriorStats) {
        this.exteriorStats.style.opacity = '0';
        this.exteriorStats.style.pointerEvents = 'none';
      }

      const annotations = CHAPTER_COPY[1].annotations;
      let activeAnno = null;
      for (let i = 0; i < annotations.length; i++) {
        const a = annotations[i];
        if (p >= a.progressRange[0] && p <= a.progressRange[1]) {
          activeAnno = a;
          break;
        }
      }
      if (!activeAnno && annotations.length > 0) {
        activeAnno = annotations[0];
      }

      if (activeAnno && this.orbitAnnotations) {
        this.orbitAnnotations.style.opacity = '1';
        this.orbitAnnotations.style.pointerEvents = 'auto';
        if (this.orbitBearing) this.orbitBearing.innerText = `${activeAnno.label.toUpperCase()} // 0${annotations.indexOf(activeAnno) + 1}`;
        if (this.orbitTitle) this.orbitTitle.innerText = activeAnno.text;

        this.updateLeaderLine(activeAnno.anchor, this.orbitCard, camera, width, height, isMobile);
      }
    } else {
      if (this.orbitAnnotations) {
        this.orbitAnnotations.style.opacity = '0';
        this.orbitAnnotations.style.pointerEvents = 'none';
      }
    }

    // CHAPTER 03: THE DOLLY ZOOM (0.30 - 0.36) — "Now look inside."
    if (p > 0.30 && p <= 0.36) {
      const dollyT = (p - 0.30) / (0.36 - 0.30);
      const dollyOpacity = Math.sin(dollyT * Math.PI) * 1.25;
      if (this.dollyZoomScreen) {
        this.dollyZoomScreen.style.opacity = Math.min(1, Math.max(0, dollyOpacity));
        this.dollyZoomScreen.style.pointerEvents = 'none';
      }
    } else {
      if (this.dollyZoomScreen) {
        this.dollyZoomScreen.style.opacity = '0';
        this.dollyZoomScreen.style.pointerEvents = 'none';
      }
    }

    // CHAPTER 04: THE TEARDOWN (0.36 - 0.75) — "Layer by layer"
    if (p > 0.36 && p <= 0.75) {
      const tearT = (p - 0.36) / (0.75 - 0.36);
      let layerKey = 'body_panels';
      if (tearT < 0.18) layerKey = 'body_panels';
      else if (tearT < 0.35) layerKey = 'glass_and_lights';
      else if (tearT < 0.52) layerKey = 'interior';
      else if (tearT < 0.70) layerKey = 'mechanical';
      else if (tearT < 0.85) layerKey = 'brakes';
      else layerKey = 'wheels';

      this.showSpecimenCard(layerKey, camera, width, height, isMobile);
      this.updateDepthRuler(layerKey);

      if (this.xraySliderWrap) {
        this.xraySliderWrap.style.opacity = '1';
        this.xraySliderWrap.style.pointerEvents = 'auto';
      }
    } else {
      this.hideCallout();
      if (this.depthRuler) {
        this.depthRuler.style.opacity = '0';
        this.depthRuler.style.pointerEvents = 'none';
      }
      if (this.xraySliderWrap) {
        this.xraySliderWrap.style.opacity = '0';
        this.xraySliderWrap.style.pointerEvents = 'none';
      }
    }

    // CHAPTER 05: THE MACRO (0.75 - 0.90) — "Details nobody asked for."
    if (p > 0.75 && p <= 0.90) {
      const macroT = (p - 0.75) / (0.90 - 0.75);
      const macroOpacity = Math.sin(macroT * Math.PI) * 1.15;

      if (this.directorsNoteCard) {
        this.directorsNoteCard.style.opacity = Math.min(1, Math.max(0, macroOpacity));
        this.directorsNoteCard.style.pointerEvents = 'auto';
      }

      if (this.detailsSection) {
        this.detailsSection.style.opacity = Math.min(1, Math.max(0, macroOpacity));
        this.detailsSection.style.pointerEvents = 'auto';
        let detailIdx = macroT < 0.5 ? 0 : 1;
        this.updateDetailContent(detailIdx);
      }
    } else {
      if (this.directorsNoteCard) {
        this.directorsNoteCard.style.opacity = '0';
        this.directorsNoteCard.style.pointerEvents = 'none';
      }
      if (this.detailsSection) {
        this.detailsSection.style.opacity = '0';
        this.detailsSection.style.pointerEvents = 'none';
      }
    }

    // CHAPTER 06: THE FINALE (0.90 - 1.00) — "Make it yours."
    if (p > 0.90) {
      const ctaT = (p - 0.90) / (1.00 - 0.90);
      if (this.ctaSection) {
        this.ctaSection.style.opacity = Math.min(1, ctaT * 1.5);
        this.ctaSection.style.pointerEvents = 'auto';
      }
      if (this.finaleCtaHero) {
        this.finaleCtaHero.style.opacity = Math.min(1, ctaT * 1.8);
      }
      if (this.dragHint) {
        this.dragHint.style.opacity = p >= 0.94 ? '1' : '0';
      }
    } else {
      if (this.ctaSection) {
        this.ctaSection.style.opacity = '0';
        this.ctaSection.style.pointerEvents = 'none';
      }
      if (this.finaleCtaHero) {
        this.finaleCtaHero.style.opacity = '0';
      }
      if (this.dragHint) {
        this.dragHint.style.opacity = '0';
      }
    }
  }

  showSpecimenCard(key, camera, width, height, isMobile) {
    const specimen = CHAPTER_COPY[3]?.specimens?.[key];
    if (!specimen) return;

    if (this.activeCalloutKey !== key) {
      this.activeCalloutKey = key;
      const badge = document.getElementById('callout-badge');
      const title = document.getElementById('callout-title');
      const desc = document.getElementById('callout-desc');
      const statVal = document.getElementById('callout-stat-val');
      const statLbl = document.getElementById('callout-stat-lbl');

      if (badge) badge.innerText = specimen.layer;
      if (title) title.innerText = specimen.name;
      if (desc) desc.innerText = specimen.story;
      if (statVal) statVal.innerText = specimen.heroValue;
      if (statLbl) statLbl.innerText = specimen.heroLabel;

      if (this.calloutCard) {
        this.calloutCard.style.opacity = '1';
        this.calloutCard.style.pointerEvents = 'auto';
      }
    }

    this.updateLeaderLine(specimen.anchor, this.calloutCard, camera, width, height, isMobile);
  }

  updateDepthRuler(layerKey) {
    if (!this.depthRuler) return;
    this.depthRuler.style.opacity = '1';
    this.depthRuler.style.pointerEvents = 'auto';

    const order = ['body_panels', 'glass_and_lights', 'interior', 'mechanical', 'brakes', 'wheels'];
    const idx = Math.max(0, order.indexOf(layerKey));

    if (this.rulerNotches) {
      this.rulerNotches.forEach((notch) => {
        const matches = notch.dataset.layer === layerKey;
        notch.classList.toggle('active', matches);
      });
    }

    if (this.depthRulerThumb) {
      const percent = (idx / (order.length - 1)) * 88;
      this.depthRulerThumb.style.top = `${percent}%`;
    }
  }

  updateLeaderLine(targetAnchor, cardElement, camera, width, height, isMobile) {
    if (!targetAnchor || !this.leaderLineSvg || !camera) return;

    const proj = this.explode.projectToScreen(targetAnchor, camera, width, height);

    if (proj.visible && !isMobile && cardElement) {
      this.leaderLineSvg.style.opacity = '1';
      const cardRect = cardElement.getBoundingClientRect();
      const cardX = cardRect.left > width * 0.5 ? cardRect.left : cardRect.right;
      const cardY = cardRect.top + cardRect.height * 0.45;

      const midX = (proj.x + cardX) / 2;
      const pathD = `M ${proj.x} ${proj.y} C ${midX} ${proj.y}, ${midX} ${cardY}, ${cardX} ${cardY}`;

      if (this.leaderPath) this.leaderPath.setAttribute('d', pathD);
      if (this.leaderDot) {
        this.leaderDot.setAttribute('cx', proj.x);
        this.leaderDot.setAttribute('cy', proj.y);
      }
    } else if (proj.visible && isMobile) {
      this.leaderLineSvg.style.opacity = '1';
      if (this.leaderPath) this.leaderPath.setAttribute('d', '');
      if (this.leaderDot) {
        this.leaderDot.setAttribute('cx', proj.x);
        this.leaderDot.setAttribute('cy', proj.y);
      }
    } else {
      this.leaderLineSvg.style.opacity = '0';
    }
  }

  showCallout(key, camera, width, height) {
    const isMobile = width <= 768;
    this.showSpecimenCard(key, camera, width, height, isMobile);
  }

  hideCallout() {
    if (this.calloutCard) {
      this.calloutCard.style.opacity = '0';
      this.calloutCard.style.pointerEvents = 'none';
    }
    if (this.leaderLineSvg) {
      this.leaderLineSvg.style.opacity = '0';
    }
    this.activeCalloutKey = null;
  }

  updateDetailContent(index) {
    const det = CONFIG.DETAILS[index];
    if (!det) return;

    const title = document.getElementById('detail-title');
    const subtitle = document.getElementById('detail-subtitle');
    const desc = document.getElementById('detail-desc');
    if (title) title.innerText = det.title;
    if (subtitle) subtitle.innerText = det.subtitle;
    if (desc) desc.innerText = det.description;
  }

  updateFilmReelHud(p) {
    const ranges = [
      [0.00, 0.12], // 01 The Reveal
      [0.12, 0.30], // 02 The Orbit
      [0.30, 0.36], // 03 The Dolly Zoom
      [0.36, 0.75], // 04 The Teardown
      [0.75, 0.90], // 05 The Macro
      [0.90, 1.00]  // 06 The Finale
    ];

    let activeIdx = 0;
    ranges.forEach(([start, end], idx) => {
      if (p >= start && (p < end || (idx === ranges.length - 1 && p <= end))) {
        activeIdx = idx;
      }
    });

    const chapterData = CHAPTER_COPY[activeIdx];
    if (chapterData) {
      if (this.reelCurrentNum) this.reelCurrentNum.innerText = chapterData.number;
      if (this.reelCurrentTitle) this.reelCurrentTitle.innerText = chapterData.title;
      if (this.reelCurrentMove) this.reelCurrentMove.innerText = chapterData.move.toUpperCase();
    }
  }

  updateChapterDots(p) {
    const ranges = [
      [0.00, 0.12], // 01 Reveal
      [0.12, 0.30], // 02 Orbit
      [0.30, 0.36], // 03 Dolly Zoom
      [0.36, 0.75], // 04 Teardown
      [0.75, 0.90], // 05 Macro
      [0.90, 1.00]  // 06 Finale
    ];

    let activeIdx = 0;
    ranges.forEach(([start, end], idx) => {
      if (p >= start && (p < end || (idx === ranges.length - 1 && p <= end))) {
        activeIdx = idx;
      }
    });

    this.chapterDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
      dot.setAttribute('aria-current', idx === activeIdx ? 'step' : 'false');
    });

    const nav = document.querySelector('.chapter-nav');
    if (nav) {
      nav.style.setProperty('--scroll-progress', String(p));
    }
  }
}
