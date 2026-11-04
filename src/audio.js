/**
 * Cinematic Web Audio System
 *
 * Implements:
 * 1. Procedural ambient luxury sound bed (deep analog drone with gentle harmonic shimmer)
 * 2. High-speed cinematic whoosh / wind draft sound on chapter transitions
 * 3. Soft UI click feedback
 * 4. Mute toggle button with state persistence (OFF by default)
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Off by default as required
    this.ambientGain = null;
    this.sfxGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.subOsc = null;
    this.filter = null;
    this.isPlayingAmbient = false;
    this.lastWhooshTime = 0;

    // Load saved mute preference if user explicitly changed it, otherwise default to muted (true)
    const saved = localStorage.getItem('audio_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master gains
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.startAmbientDrone();
  }

  startAmbientDrone() {
    if (!this.ctx || this.isPlayingAmbient) return;

    // Deep warm cinema drone: 55Hz (A1) and 110Hz (A2) with subtle beating
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
    filter.connect(this.ambientGain);
    this.filter = filter;

    // Sub oscillator
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Warm stereo detuned drone oscillators
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(110.0, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(110.8, this.ctx.currentTime); // 0.8Hz beating

    // Gain for osc2 to keep it subtle
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    subOsc.connect(filter);
    osc1.connect(filter);

    subOsc.start();
    osc1.start();
    osc2.start();

    this.subOsc = subOsc;
    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;
    this.isPlayingAmbient = true;

    // Fade ambient gain up smoothly
    if (!this.isMuted) {
      this.ambientGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 1.2);
    }
  }

  /**
   * Modulates engine idle pitch with scroll progress & scrub velocity.
   * Silences audio at the Chapter 3 Dolly Zoom for cinematic emphasis.
   */
  updateEnginePitch(p, vel = 0) {
    if (this.isMuted || !this.ctx || !this.subOsc || !this.droneOsc1) return;

    // Silence at the Chapter 3 Hitchcock Dolly Zoom
    const isDolly = p >= 0.30 && p <= 0.36;
    if (isDolly) {
      this.ambientGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.06);
      return;
    }

    // Low engine idle rising with scroll and velocity
    const baseFreq = 52.0;
    const progressRamp = p * 42.0;
    const velRamp = Math.min(55.0, vel * 900.0);
    const targetFreq = baseFreq + progressRamp + velRamp;

    this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, this.ctx.currentTime, 0.08);
    this.droneOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    if (this.droneOsc2) {
      this.droneOsc2.frequency.setTargetAtTime(targetFreq * 1.008, this.ctx.currentTime, 0.08);
    }

    if (this.ambientGain.gain.value < 0.15) {
      this.ambientGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.15);
    }
  }

  toggleMute() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    localStorage.setItem('audio_muted', String(this.isMuted));

    if (this.ctx && this.ambientGain) {
      const target = this.isMuted ? 0 : 0.22;
      this.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime, 0.1);
    }

    this.updateToggleUI();

    if (!this.isMuted) {
      this.playWhoosh(0.15);
    }

    return !this.isMuted;
  }

  playWhoosh(intensity = 0.4) {
    if (this.isMuted || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastWhooshTime < 300) return; // Debounce fast consecutive triggers
    this.lastWhooshTime = now;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pinkish filtered noise
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.15;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.45);
    filter.Q.setValueAtTime(2.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(intensity, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.46);
  }

  playClick() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  setupUI() {
    const btn = document.getElementById('audio-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.toggleMute();
    });

    this.updateToggleUI();
  }

  updateToggleUI() {
    const btn = document.getElementById('audio-toggle');
    if (!btn) return;

    btn.classList.toggle('muted', this.isMuted);
    btn.classList.toggle('active', !this.isMuted);
    btn.setAttribute('aria-pressed', String(!this.isMuted));
    btn.setAttribute('title', this.isMuted ? 'Unmute Audio Experience' : 'Mute Audio');

    const label = btn.querySelector('.audio-label');
    if (label) {
      label.innerText = this.isMuted ? 'SOUND OFF' : 'SOUND ON';
    }
  }
}

export const audioManager = new AudioManager();
