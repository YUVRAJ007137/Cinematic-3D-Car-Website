import * as THREE from 'three';
import { audioManager } from './audio.js';

/**
 * Interactive 3D Hotspots & Raycasting System
 *
 * Implements:
 * 1. Raycast detection matching inspector.html (dist <= 5px, time <= 350ms)
 * 2. 3D-to-2D projected screen pins with occluding depth check
 * 3. Hover tooltip feedback and cursor transformation
 * 4. Rich technical specification popover cards with glassmorphic styling
 */

export const HOTSPOT_DATA = [
  {
    id: 'headlights',
    targetMeshNames: ['Head_Lights_Glass', 'CHROME_REFLECTOR', 'LIGHT_GLOW', 'headlight'],
    anchor: [0.55, 0.62, 1.62],
    tag: 'OPTICAL ARRAY',
    title: 'Quad-LED Matrix Projectors',
    stat: '9,600 LM',
    statLabel: 'Total Luminous Flux',
    desc: 'Four compact high-intensity LED projection modules per headlamp cluster with CNC-milled aluminum cooling heatsinks and adaptive cornering beam.'
  },
  {
    id: 'front_splitter',
    targetMeshNames: ['Box002004', 'horseshoe', 'bumper', 'splitter'],
    anchor: [0.0, 0.28, 1.95],
    tag: 'AERODYNAMICS',
    title: 'Carbon Horseshoe Splitter',
    stat: '1.9 M²',
    statLabel: 'Active Downforce Surface',
    desc: 'Signature horseshoe front grille and wide carbon-composite lower front splitter channelling high-velocity air into twin brake cooling ducts.'
  },
  {
    id: 'powertrain',
    targetMeshNames: ['proc_crankcase', 'proc_cylinder_bank_L', 'proc_cylinder_bank_R', 'proc_intake_L', 'proc_turbo_FL', 'engine'],
    anchor: [0.0, 0.68, -0.65],
    tag: 'POWERTRAIN',
    title: '8.0L Quad-Turbo W16 Engine',
    stat: '1,500 PS',
    statLabel: 'At 6,900 RPM (1,600 Nm Torque)',
    desc: 'Mid-mounted bespoke W16 architecture with four twin-scroll turbochargers, dry-sump lubrication, and carbon-titanium intake plenums.'
  },
  {
    id: 'brakes',
    targetMeshNames: ['Caliper_039', 'Caliper', 'brake', 'rotor'],
    anchor: [0.74, 0.38, 1.15],
    tag: 'CHASSIS & BRAKING',
    title: 'Carbon-Ceramic Monobloc Brakes',
    stat: '420 MM',
    statLabel: 'Carbon-Silicon-Carbide Discs',
    desc: 'Titanium 8-piston monobloc front calipers biting 420mm cross-drilled carbon-ceramic rotors. Resists thermal fade beyond 1,000°C.'
  },
  {
    id: 'wheels',
    targetMeshNames: ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR', 'tire', 'rim'],
    anchor: [0.82, 0.38, 1.15],
    tag: 'WHEEL DYNAMICS',
    title: 'Forged Magnesium Aero-Blade Wheels',
    stat: '-16 KG',
    statLabel: 'Unsprung Rotating Mass Saved',
    desc: 'Ultra-lightweight forged magnesium wheels featuring carbon aero rings that draw hot air outward from the wheel arches during high lateral load.'
  },
  {
    id: 'rear_wing',
    targetMeshNames: ['wing', 'spoiler', 'rear'],
    anchor: [0.0, 1.12, -1.82],
    tag: 'DOWNFORCE',
    title: '1.90m Fixed Carbon Rear Wing',
    stat: '350 KG',
    statLabel: 'Downforce at 250 km/h',
    desc: 'Lightweight fixed carbon-composite rear wing spanning 1.90 meters, producing massive high-speed stability and positive aerodynamic balance.'
  },
  {
    id: 'cockpit',
    targetMeshNames: ['int', 'SEAT_STITCHES', 'STITCH', 'speedook', 'dashboard', 'seat'],
    anchor: [0.15, 0.76, 0.05],
    tag: 'COCKPIT',
    title: 'Driver-Centric Alcantara Interior',
    stat: 'Alcantara®',
    statLabel: 'High-Grip Motorsport Trim',
    desc: 'Stripped-back luxury cabin upholstered in matte black Alcantara with contrasting French Racing Blue stitching, anodized aluminum dials, and carbon bucket seats.'
  }
];

export class HotspotManager {
  constructor(scene, camera, canvas, carContainer) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.carContainer = carContainer;

    this.containerEl = document.getElementById('hotspot-container');
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.hotspotElements = new Map();
    this.activeHotspotId = null;
    this.isVisible = true;

    // Interaction tracking
    this.downTime = 0;
    this.downPos = { x: 0, y: 0 };

    this.tempVec = new THREE.Vector3();
    this.camDir = new THREE.Vector3();

    this.createHotspotPins();
    this.createPopoverCard();
    this.setupEventListeners();
  }

  createHotspotPins() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = '';

    HOTSPOT_DATA.forEach((spot) => {
      const pin = document.createElement('button');
      pin.className = 'hotspot-pin';
      pin.dataset.id = spot.id;
      pin.setAttribute('aria-label', `View details for ${spot.title}`);

      pin.innerHTML = `
        <span class="hotspot-pulse"></span>
        <span class="hotspot-icon">+</span>
        <span class="hotspot-label">${spot.tag}</span>
      `;

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPopover(spot.id);
      });

      this.containerEl.appendChild(pin);
      this.hotspotElements.set(spot.id, pin);
    });
  }

  createPopoverCard() {
    let popover = document.getElementById('hotspot-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'hotspot-popover';
      popover.className = 'hotspot-popover';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-live', 'polite');
      popover.innerHTML = `
        <button class="hotspot-popover-close" id="btn-close-hotspot" aria-label="Close specification">✕</button>
        <div class="hotspot-popover-tag" id="hotspot-tag">TAG</div>
        <h3 class="hotspot-popover-title" id="hotspot-title">Title</h3>
        <div class="hotspot-popover-stat-group">
          <div class="hotspot-popover-stat" id="hotspot-stat">000</div>
          <div class="hotspot-popover-stat-lbl" id="hotspot-stat-lbl">Metric</div>
        </div>
        <p class="hotspot-popover-desc" id="hotspot-desc">Description text</p>
      `;
      document.body.appendChild(popover);

      const closeBtn = popover.querySelector('#btn-close-hotspot');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closePopover());
      }
    }
    this.popoverEl = popover;
  }

  setupEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener('pointerdown', (e) => {
      this.downTime = performance.now();
      this.downPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y);
      const duration = performance.now() - this.downTime;

      // Click detected (not drag orbit)
      if (dist <= 6 && duration <= 350) {
        this.onCanvasClick(e);
      }
    });

    // Close on backdrop or outside click
    window.addEventListener('click', (e) => {
      if (this.popoverEl && this.popoverEl.classList.contains('open')) {
        if (!this.popoverEl.contains(e.target) && !e.target.closest('.hotspot-pin')) {
          this.closePopover();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popoverEl && this.popoverEl.classList.contains('open')) {
        this.closePopover();
      }
    });
  }

  onCanvasClick(e) {
    if (!this.carContainer || !this.camera) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.carContainer, true);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const hitName = hitMesh.name.toLowerCase();

      // Find matching hotspot by targetMeshNames or by distance to anchor
      let match = HOTSPOT_DATA.find((spot) =>
        spot.targetMeshNames.some((n) => hitName.includes(n.toLowerCase()))
      );

      if (!match) {
        // Fallback: match by closest anchor point
        let closestDist = Infinity;
        HOTSPOT_DATA.forEach((spot) => {
          this.tempVec.set(...spot.anchor);
          const d = this.tempVec.distanceTo(intersects[0].point);
          if (d < closestDist && d < 1.4) {
            closestDist = d;
            match = spot;
          }
        });
      }

      if (match) {
        this.openPopover(match.id);
      }
    }
  }

  openPopover(id) {
    const data = HOTSPOT_DATA.find((h) => h.id === id);
    if (!data || !this.popoverEl) return;

    this.activeHotspotId = id;
    audioManager.playClick();

    document.getElementById('hotspot-tag').innerText = data.tag;
    document.getElementById('hotspot-title').innerText = data.title;
    document.getElementById('hotspot-stat').innerText = data.stat;
    document.getElementById('hotspot-stat-lbl').innerText = data.statLabel;
    document.getElementById('hotspot-desc').innerText = data.desc;

    this.popoverEl.classList.add('open');

    // Highlight active pin
    this.hotspotElements.forEach((el, key) => {
      el.classList.toggle('active', key === id);
    });
  }

  closePopover() {
    if (!this.popoverEl) return;
    this.popoverEl.classList.remove('open');
    this.activeHotspotId = null;

    this.hotspotElements.forEach((el) => {
      el.classList.remove('active');
    });
  }

  update(progress, camera) {
    if (!this.containerEl) return;

    // Show hotspots in Chapter 2 (Exterior: 0.10 - 0.28) and Chapter 6 (Configurator: >= 0.92)
    const inExterior = progress >= 0.10 && progress <= 0.28;
    const inCTA = progress >= 0.93;
    const shouldShow = inExterior || inCTA;

    if (!shouldShow) {
      if (this.isVisible) {
        this.containerEl.style.opacity = '0';
        this.containerEl.style.pointerEvents = 'none';
        this.closePopover();
        this.isVisible = false;
      }
      return;
    }

    if (!this.isVisible) {
      this.containerEl.style.opacity = '1';
      this.containerEl.style.pointerEvents = 'auto';
      this.isVisible = true;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.getWorldDirection(this.camDir);

    HOTSPOT_DATA.forEach((spot) => {
      const pin = this.hotspotElements.get(spot.id);
      if (!pin) return;

      this.tempVec.set(...spot.anchor);

      // Occlusion check: vector from camera to point
      const toPoint = this.tempVec.clone().sub(camera.position).normalize();
      const dot = toPoint.dot(this.camDir);

      // Project 3D anchor to normalized screen space (-1 to +1)
      this.tempVec.project(camera);

      // Behind camera or too close to screen edges
      const isBehind = this.tempVec.z > 1.0 || dot <= 0.2;
      const isOffscreen = this.tempVec.x < -1.1 || this.tempVec.x > 1.1 || this.tempVec.y < -1.1 || this.tempVec.y > 1.1;

      if (isBehind || isOffscreen) {
        pin.style.opacity = '0';
        pin.style.pointerEvents = 'none';
        return;
      }

      // Convert to CSS pixels
      const x = (this.tempVec.x * 0.5 + 0.5) * width;
      const y = (-this.tempVec.y * 0.5 + 0.5) * height;

      pin.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      pin.style.opacity = '1';
      pin.style.pointerEvents = 'auto';
    });
  }
}
