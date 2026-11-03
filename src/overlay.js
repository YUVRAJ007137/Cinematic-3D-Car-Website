import { CONFIG } from './content.js';
import { setPaintColor, setPaintFinish, setXRayAmount } from './materials.js';

/**
 * Cinematic HTML/SVG Overlay & Showroom Interaction Manager
 * (PRD Phases 3, 4, 5, 7 + Upgrades)
 *
 * Features:
 * 1. Animated SVG Leader Lines with glow and dynamic anchor tracking
 * 2. Surface Finish Selector (Ultra Gloss, Satin Frosted, Stealth Matte)
 * 3. Interactive X-Ray / Holographic Chassis Slider
 * 4. 360° Drag to Explore Visual Indicator
 * 5. Floating Luxury Configurator Bottom Dock
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

    // Specifications Modal Elements
    this.specsModal = document.getElementById('specs-modal');
    this.specsModalBackdrop = document.getElementById('specs-modal-backdrop');
    this.btnOpenSpecs = document.getElementById('btn-open-specs');
    this.btnCloseSpecs = document.getElementById('btn-close-specs');

    this.activeCalloutKey = null;

    this.setupColorSwitcher();
    this.setupFinishSwitcher();
    this.setupXRayControl();
    this.setupSpecsModal();
  }

  setupColorSwitcher() {
    const swatches = document.querySelectorAll('.paint-swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        swatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const colorKey = swatch.dataset.color;
        setPaintColor(colorKey);
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
      });
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
      this.specsModal.style.display = 'flex';
      void this.specsModal.offsetWidth; // Force reflow
      this.specsModal.classList.add('open');
    };

    const closeModal = () => {
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

  /**
   * Main per-frame update driven by master progress [0, 1]
   */
  update(p, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Chapter Dots active state
    this.updateChapterDots(p);

    // 2. Chapter 1: Hero Reveal (0.00 - 0.10)
    if (p <= 0.11) {
      const heroT = p / 0.10;
      const barHeight = Math.max(0, (1 - heroT) * 12);
      if (this.letterboxTop) this.letterboxTop.style.height = `${barHeight}vh`;
      if (this.letterboxBottom) this.letterboxBottom.style.height = `${barHeight}vh`;

      const heroOpacity = Math.max(0, 1 - (p / 0.08));
      this.heroSection.style.opacity = heroOpacity;
      this.heroSection.style.transform = `translateY(${p * -120}px)`;
      this.heroSection.style.pointerEvents = heroOpacity > 0.1 ? 'auto' : 'none';
    } else {
      if (this.letterboxTop) this.letterboxTop.style.height = '0vh';
      if (this.letterboxBottom) this.letterboxBottom.style.height = '0vh';
      this.heroSection.style.opacity = '0';
      this.heroSection.style.pointerEvents = 'none';
    }

    // 3. Chapter 2: Exterior Headline Stats (0.10 - 0.28)
    if (p > 0.10 && p <= 0.28) {
      const extT = (p - 0.10) / (0.28 - 0.10);
      this.exteriorStats.style.opacity = Math.sin(extT * Math.PI) * 1.2;
      this.exteriorStats.style.pointerEvents = 'auto';

      const statCards = this.exteriorStats.querySelectorAll('.stat-card');
      statCards.forEach((card, idx) => {
        const threshold = idx * 0.25;
        const cardOpacity = Math.min(1, Math.max(0, (extT - threshold) * 3));
        card.style.opacity = cardOpacity;
        card.style.transform = `translateY(${(1 - cardOpacity) * 20}px)`;
      });
    } else {
      this.exteriorStats.style.opacity = '0';
      this.exteriorStats.style.pointerEvents = 'none';
    }

    // 4. Chapter 3: Exploded View Callouts & Leader Line (0.28 - 0.68)
    if (p > 0.28 && p <= 0.68) {
      const explodeT = (p - 0.28) / (0.68 - 0.28);
      let calloutKey = null;

      if (explodeT < 0.18) calloutKey = 'body_panels';
      else if (explodeT < 0.35) calloutKey = 'glass_and_lights';
      else if (explodeT < 0.52) calloutKey = 'interior';
      else if (explodeT < 0.70) calloutKey = 'mechanical';
      else if (explodeT < 0.85) calloutKey = 'brakes';
      else calloutKey = 'wheels';

      this.showCallout(calloutKey, camera, width, height);

      if (this.xraySliderWrap) {
        this.xraySliderWrap.style.opacity = '1';
        this.xraySliderWrap.style.pointerEvents = 'auto';
      }
    } else {
      this.hideCallout();
      if (this.xraySliderWrap) {
        this.xraySliderWrap.style.opacity = '0';
        this.xraySliderWrap.style.pointerEvents = 'none';
      }
    }

    // 5. Chapter 5: Detail Shots (0.78 - 0.92)
    if (p > 0.78 && p <= 0.92) {
      const detT = (p - 0.78) / (0.92 - 0.78);
      this.detailsSection.style.opacity = Math.sin(detT * Math.PI) * 1.1;
      this.detailsSection.style.pointerEvents = 'auto';

      let detailIdx = 0;
      if (detT < 0.33) detailIdx = 0;
      else if (detT < 0.66) detailIdx = 1;
      else detailIdx = 2;

      this.updateDetailContent(detailIdx);
    } else {
      this.detailsSection.style.opacity = '0';
      this.detailsSection.style.pointerEvents = 'none';
    }

    // 6. Chapter 6: CTA & Free 360° Drag Orbit (0.92 - 1.00)
    if (p > 0.92) {
      const ctaT = (p - 0.92) / (1.00 - 0.92);
      this.ctaSection.style.opacity = Math.min(1, ctaT * 1.5);
      // Keep section pointer-events none so user can freely click & drag the 3D car!
      this.ctaSection.style.pointerEvents = 'none';

      if (this.dragHint) {
        this.dragHint.style.opacity = p >= 0.95 ? '1' : '0';
      }
    } else {
      this.ctaSection.style.opacity = '0';
      this.ctaSection.style.pointerEvents = 'none';
      if (this.dragHint) {
        this.dragHint.style.opacity = '0';
      }
    }
  }

  showCallout(key, camera, width, height) {
    const data = CONFIG.CALLOUTS[key];
    if (!data) return;

    if (this.activeCalloutKey !== key) {
      this.activeCalloutKey = key;

      document.getElementById('callout-badge').innerText = data.badge;
      document.getElementById('callout-title').innerText = data.title;
      document.getElementById('callout-stat-val').innerText = data.statValue;
      document.getElementById('callout-stat-lbl').innerText = data.statLabel;
      document.getElementById('callout-desc').innerText = data.description;

      this.calloutCard.style.opacity = '1';
      this.calloutCard.style.pointerEvents = 'auto';
    }

    const proj = this.explode.projectToScreen(data.targetAnchor, camera, width, height);

    if (proj.visible) {
      this.leaderLineSvg.style.opacity = '1';

      const cardRect = this.calloutCard.getBoundingClientRect();
      const cardX = cardRect.left;
      const cardY = cardRect.top + cardRect.height * 0.45;

      const midX = (proj.x + cardX) / 2;
      const pathD = `M ${proj.x} ${proj.y} C ${midX} ${proj.y}, ${midX} ${cardY}, ${cardX} ${cardY}`;

      this.leaderPath.setAttribute('d', pathD);
      this.leaderDot.setAttribute('cx', proj.x);
      this.leaderDot.setAttribute('cy', proj.y);
    } else {
      this.leaderLineSvg.style.opacity = '0';
    }
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

    document.getElementById('detail-title').innerText = det.title;
    document.getElementById('detail-subtitle').innerText = det.subtitle;
    document.getElementById('detail-desc').innerText = det.description;
  }

  updateChapterDots(p) {
    const ranges = [
      [0.00, 0.10], // Hero
      [0.10, 0.28], // Exterior
      [0.28, 0.68], // Explode
      [0.68, 0.78], // Reassemble
      [0.78, 0.92], // Details
      [0.92, 1.00]  // CTA
    ];

    let activeIdx = 0;
    ranges.forEach(([start, end], idx) => {
      if (p >= start && p <= end) activeIdx = idx;
    });

    this.chapterDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
      dot.setAttribute('aria-current', idx === activeIdx ? 'step' : 'false');
    });
  }
}
