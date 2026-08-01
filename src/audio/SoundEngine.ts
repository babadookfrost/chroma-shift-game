/**
 * SoundEngine utilizes Web Audio API to procedurally synthesize high-quality AAA audio
 * with ZERO external asset dependencies. It includes an ambient low-LFO drone, beam hums,
 * placement taps, crystal activation chimes, and arpeggiated success chords.
 */
export class SoundEngine {
  private static ctx: AudioContext | null = null;
  private static masterVolumeNode: GainNode | null = null;
  private static droneOscillator: OscillatorNode | null = null;
  private static droneLfo: OscillatorNode | null = null;
  private static droneGain: GainNode | null = null;

  private static volume = 0.8;
  private static isMuted = false;

  /**
   * Initializes the AudioContext on first touch/interaction (iOS requirement).
   */
  static init(): void {
    if (this.ctx) return;

    // Load initial volume preferences
    const storedVol = localStorage.getItem('chroma_audio_volume');
    if (storedVol !== null) this.volume = parseFloat(storedVol);
    const storedMute = localStorage.getItem('chroma_audio_muted');
    if (storedMute !== null) this.isMuted = storedMute === 'true';

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterVolumeNode = this.ctx.createGain();
      this.masterVolumeNode.connect(this.ctx.destination);
      this.updateVolume();

      // Start the continuous ambient space drone
      this.startAmbientDrone();
    } catch (e) {
      console.warn('[SoundEngine] Web Audio API not supported on this device: ', e);
    }
  }

  /**
   * Resumes AudioContext if it was suspended (safari / chrome browser unlock policies).
   */
  static async resume(): Promise<void> {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Sets master volume (0.0 to 1.0).
   */
  static setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    localStorage.setItem('chroma_audio_volume', this.volume.toString());
    this.updateVolume();
  }

  /**
   * Retrieves active volume.
   */
  static getVolume(): number {
    return this.volume;
  }

  /**
   * Toggles mute status.
   */
  static setMute(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('chroma_audio_muted', this.isMuted.toString());
    this.updateVolume();
  }

  /**
   * Retrieves active mute state.
   */
  static getMuted(): boolean {
    return this.isMuted;
  }

  private static updateVolume(): void {
    if (!this.masterVolumeNode) return;
    const targetVal = this.isMuted ? 0 : this.volume;
    this.masterVolumeNode.gain.setValueAtTime(targetVal, this.ctx ? this.ctx.currentTime : 0);
  }

  /**
   * Starts continuous, slow-LFO space drone representing the background environment.
   */
  private static startAmbientDrone(): void {
    if (!this.ctx || !this.masterVolumeNode) return;

    try {
      // Background drone oscillator (low deep warmth)
      this.droneOscillator = this.ctx.createOscillator();
      this.droneOscillator.type = 'triangle';
      this.droneOscillator.frequency.value = 55; // A1 pitch

      // Filter to keep it warm and low
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 1.0;

      // Slow LFO for frequency sweeps (breathing effect)
      this.droneLfo = this.ctx.createOscillator();
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.value = 0.08; // extremely slow sweep (12 seconds)

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 40; // Sweep range: 140Hz to 220Hz

      this.droneLfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Gain node for drone volume
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.25; // Subtle background layer

      // Wire them up
      this.droneOscillator.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.masterVolumeNode);

      // Start oscillators
      this.droneOscillator.start(0);
      this.droneLfo.start(0);
    } catch (e) {
      console.warn('[SoundEngine] Ambient drone start failed: ', e);
    }
  }

  /**
   * Synthesizes a beautiful neon click/tap with subtle spatial panning.
   */
  static playTap(screenX: number = 400): void {
    this.resume();
    if (!this.ctx || !this.masterVolumeNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.createPanner(screenX);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterVolumeNode);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Play crystal hit sound when beam connects. Uses additive frequency synthesis.
   */
  static playCrystalActivation(screenX: number = 400): void {
    this.resume();
    if (!this.ctx || !this.masterVolumeNode) return;

    const t = this.ctx.currentTime;
    const freqs = [329.63, 440.00, 523.25, 659.25, 880.00]; // Sparkly crystalline A minor chord
    const panner = this.createPanner(screenX);

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // High frequency sparkle drops off quickly, lower frequencies stay a bit longer
      const duration = 0.4 + i * 0.15;

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(panner);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    });

    panner.connect(this.masterVolumeNode);
  }

  /**
   * Play level completion major pentatonic arpeggio sweep!
   */
  static playLevelComplete(): void {
    this.resume();
    if (!this.ctx || !this.masterVolumeNode) return;

    const t = this.ctx.currentTime;
    // Gorgeous neon success chord: C Maj 9 arpeggio (C4, E4, G4, B4, D5, G5)
    const arpeggio = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99];

    arpeggio.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Filter sweep on each note for gorgeous retro-synth feel
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, noteTime);
      filter.frequency.exponentialRampToValueAtTime(2500, noteTime + 0.1);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolumeNode!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.9);
    });
  }

  /**
   * Play snapping or grid placing chime.
   */
  static playSnap(screenX: number = 400): void {
    this.resume();
    if (!this.ctx || !this.masterVolumeNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.createPanner(screenX);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterVolumeNode);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Stereo balancer creating full-spatial audio depth.
   * Maps 0px to 800px screen coordinates into a standard StereoPannerNode or custom balance gain.
   */
  private static createPanner(screenX: number): StereoPannerNode {
    if (!SoundEngine.ctx) throw new Error('AudioContext uninitialized');

    // standard width is 800. Map 0-800 to -1.0 to 1.0 balance.
    const panVal = Math.max(-1, Math.min(1, (screenX / 800) * 2 - 1));

    if (SoundEngine.ctx.createStereoPanner) {
      const node = SoundEngine.ctx.createStereoPanner();
      node.pan.setValueAtTime(panVal, SoundEngine.ctx.currentTime);
      return node;
    }

    // Fallback for browsers without StereoPanner support (using legacy channels or mock node)
    return {
      pan: { value: panVal },
      connect: () => {},
      disconnect: () => {}
    } as any;
  }
}
