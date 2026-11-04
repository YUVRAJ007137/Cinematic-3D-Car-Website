/**
 * Lens-Ring Cinema Reticle Cursor
 * Provides an optical lens-ring reticle that tracks the pointer on desktop,
 * tightens on part hover, and displays dynamic hotspot/component labels.
 */

export class LensCursor {
  constructor() {
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.cursorEl = document.getElementById('custom-cursor');
    if (!this.cursorEl || this.isTouch) return;

    this.mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    this.pos = { x: this.mouse.x, y: this.mouse.y };
    this.hovering = false;
    this.label = '';

    // Create label element inside cursor if missing
    this.labelEl = document.createElement('div');
    this.labelEl.className = 'cursor-label';
    this.cursorEl.appendChild(this.labelEl);

    this.initEvents();
    this.loop();
  }

  initEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    document.querySelectorAll('button, a, input, .ruler-notch, .paint-swatch').forEach((el) => {
      el.addEventListener('mouseenter', () => this.setTightened(true));
      el.addEventListener('mouseleave', () => this.setTightened(false));
    });
  }

  setTightened(tightened, labelText = '') {
    if (!this.cursorEl || this.isTouch) return;
    this.hovering = tightened;
    this.cursorEl.classList.toggle('cursor-tightened', tightened);
    this.cursorEl.classList.toggle('cursor-hover', tightened);
    if (this.labelEl) {
      this.labelEl.innerText = labelText;
      this.labelEl.style.opacity = labelText ? '1' : '0';
    }
  }

  loop() {
    if (this.isTouch || !this.cursorEl) return;
    requestAnimationFrame(() => this.loop());

    // Hydraulic lerp for lens optical inertia
    this.pos.x += (this.mouse.x - this.pos.x) * 0.22;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.22;

    this.cursorEl.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
  }
}
