
import { MusicMood } from '../types';

class MusicManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume: number = 0.4;
  private _isMuted: boolean = false;
  
  // Background Music State
  private bgm: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private fadeInterval: any = null;

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this._isMuted ? 0 : this._volume;
    }
  }

  /**
   * Must be called on the first user interaction (click/keydown)
   * to unlock the AudioContext and start any blocked BGM.
   */
  public async initializeAudio() {
    // 1. Resume Web Audio API Context (for SFX)
    if (!this.ctx) this.init();
    
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("Context resume failed", e);
      }
    }

    // 2. Resume HTML5 Audio (for BGM) if it is set but paused (likely due to autoplay block)
    if (this.bgm && this.bgm.paused && !this._isMuted) {
      this.bgm.play().catch(e => {
        // This might happen if the interaction wasn't "trusted" enough by a specific browser, though rare on click.
        console.warn("BGM start failed in initializeAudio", e);
      });
    }
  }

  public get isMuted() {
    return this._isMuted;
  }

  public toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    
    // Handle SFX Mute
    if (this.ctx && this.masterGain) {
      const targetVol = this._isMuted ? 0 : this._volume;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    }

    // Handle BGM Mute
    if (this.bgm) {
      this.bgm.volume = this._isMuted ? 0 : this._volume;
    }

    return this._isMuted;
  }

  public setVolume(val: number) {
    this._volume = Math.max(0, Math.min(1, val));
    if (this._isMuted) return;

    // Update SFX Volume
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }

    // Update BGM Volume
    if (this.bgm) {
      this.bgm.volume = this._volume;
    }
  }

  /**
   * Plays a background music track from public/music/ with Fade In/Out
   * @param filename e.g. 'menu.mp3', 'act1.mp3'
   */
  public playBgm(filename: string) {
    // If the requested track is already playing, do nothing
    if (this.currentTrack === filename) return;

    // 1. Fade Out Old Track
    if (this.bgm) {
      const oldBgm = this.bgm; // Capture reference
      const fadeOutStep = 0.05;
      const fadeOutInterval = setInterval(() => {
        if (oldBgm.volume > fadeOutStep) {
          oldBgm.volume -= fadeOutStep;
        } else {
          oldBgm.volume = 0;
          oldBgm.pause();
          clearInterval(fadeOutInterval);
        }
      }, 100);
    }

    // 2. Prepare New Track
    this.currentTrack = filename;
    this.bgm = new Audio(`/music/${filename}`);
    this.bgm.loop = true; // Ensure loop is active
    
    // Start at 0 volume for Fade In
    this.bgm.volume = 0; 

    // Attempt to play immediately (might be blocked by autoplay policy)
    const playPromise = this.bgm.play();

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("Autoplay waiting for user interaction...");
        // We don't throw here; we wait for initializeAudio() to be called by App.tsx onClick
      });
    }

    // 3. Fade In New Track
    // Clear any existing fade intervals on the main tracker to avoid conflicts
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    this.fadeInterval = setInterval(() => {
      if (!this.bgm) {
        clearInterval(this.fadeInterval);
        return;
      }

      // If muted, we keep playing (for loop continuity) but force volume to 0
      if (this._isMuted) {
        this.bgm.volume = 0;
        return;
      }

      const step = 0.02; // Slower fade in for smoothness
      if (this.bgm.volume < this._volume - step) {
        this.bgm.volume += step;
      } else {
        this.bgm.volume = this._volume;
        clearInterval(this.fadeInterval);
      }
    }, 100);
  }

  public stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
      this.currentTrack = null;
    }
  }

  // --- SFX Logic (unchanged) ---

  private playPluckedString(freq: number, startTime: number, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    sub.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    sub.frequency.setValueAtTime(freq * 1.005, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, startTime + duration);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    sub.start(startTime);
    osc.stop(startTime + duration);
    sub.stop(startTime + duration);
  }

  public playSfx(type: 'hit' | 'miss' | 'heal' | 'levelup' | 'click') {
    this.init();
    if (!this.ctx || !this.masterGain || this._isMuted) return;
    
    // Resume context if suspended (double check for SFX)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    switch (type) {
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        gain.gain.setValueAtTime(0.4 * this._volume, now);
        break;
      case 'levelup':
        [440, 554, 659, 880].forEach((f, i) => this.playPluckedString(f, now + i * 0.1, 2, 0.3 * this._volume));
        return;
      case 'heal':
        [523, 659, 783].forEach((f, i) => this.playPluckedString(f, now + i * 0.1, 1, 0.3 * this._volume));
        return;
      case 'click':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1 * this._volume, now);
        break;
      default:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1 * this._volume, now);
    }
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

export const music = new MusicManager();
