import { CONFIG } from './content.js';
import { setPaintColor } from './materials.js';

/**
 * Cinematic HTML/SVG Overlay & Accessibility Manager
 * (PRD Phases 3, 4, 5, 7)
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

    this.activeCalloutKey = null;
    this.setupColorSwitcher();
  }

  setupColorSwitcher() {
    const swatches = document.querySelectorAll('.paint-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const colorKey = swatch.dataset.color;
        setPaintColor(colorKey);
      });
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
    if (p <= 0.12) {
      const heroT = p / 0.10;
      // Letterbox bars open
      const barHeight = Math.max(0, (1 - heroT) * 12); // vh
      if (this.letterboxTop) this.letterboxTop.style.height = `${barHeight}vh`;
      if (this.letterboxBottom) this.letterboxBottom.style.height = `${barHeight}vh`;

      // Hero Title Fade
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

    // 3. Chapter 2: Exterior Headline Stats (0.12 - 0.30)
    if (p > 0.11 && p <= 0.30) {
      const extT = (p - 0.12) / (0.30 - 0.12);
      this.exteriorStats.style.opacity = Math.sin(extT * Math.PI) * 1.2;
      this.exteriorStats.style.pointerEvents = 'auto';

      // Stagger stat cards visibility
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

    // 4. Chapter 3: Exploded View Callouts & Leader Line (0.30 - 0.72)
    if (p > 0.30 && p <= 0.72) {
      const explodeT = (p - 0.30) / (0.72 - 0.30);
      let calloutKey = null;

      if (explodeT < 0.18) calloutKey = 'body_panels';
      else if (explodeT < 0.35) calloutKey = 'glass_and_lights';
      else if (explodeT < 0.52) calloutKey = 'interior';
      else if (explodeT < 0.70) calloutKey = 'mechanical';
      else if (explodeT < 0.85) calloutKey = 'brakes';
      else calloutKey = 'wheels';

      this.showCallout(calloutKey, camera, width, height);
    } else {
      this.hideCallout();
    }

    // 5. Chapter 5: Detail Shots (0.82 - 0.92)
    if (p > 0.82 && p <= 0.92) {
      const detT = (p - 0.82) / (0.92 - 0.82);
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

    // 6. Chapter 6: CTA & Footer (0.92 - 1.00)
    if (p > 0.92) {
      const ctaT = (p - 0.92) / (1.00 - 0.92);
      this.ctaSection.style.opacity = Math.min(1, ctaT * 1.5);
      this.ctaSection.style.pointerEvents = 'auto';
      this.ctaSection.style.transform = `translateY(${(1 - ctaT) * 30}px)`;
    } else {
      this.ctaSection.style.opacity = '0';
      this.ctaSection.style.pointerEvents = 'none';
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

    // 3D Anchor screen projection for Leader Line
    const proj = this.explode.projectToScreen(data.targetAnchor, camera, width, height);

    if (proj.visible) {
      this.leaderLineSvg.style.opacity = '1';

      // Card anchor point (left edge of card)
      const cardRect = this.calloutCard.getBoundingClientRect();
      const cardX = cardRect.left;
      const cardY = cardRect.top + cardRect.height * 0.45;

      // Draw SVG smooth path
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
      [0.00, 0.11], // Hero
      [0.11, 0.30], // Exterior
      [0.30, 0.72], // Explode
      [0.72, 0.82], // Reassemble
      [0.82, 0.92], // Details
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
